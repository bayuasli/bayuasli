import moment from "moment-timezone";
import fs from "fs";
import path from "path";

const TIMEZONE = "Asia/Jakarta";
const SCHEDULE_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const DB_PATH = path.join(process.cwd(), "lib", "database", "broadcast.json");

const state = {
  text: "",
  filterGroups: [],
  scheduler: null,
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    state.text = data.text || "";
    state.filterGroups = data.filterGroups || [];
  } catch {
    state.text = "";
    state.filterGroups = [];
  }
}

function saveDB() {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(
        {
          text: state.text,
          filterGroups: state.filterGroups,
        },
        null,
        2,
      ),
    );
  } catch {}
}

loadDB();

function getAllGroups(conn) {
  return Object.entries(conn.chats).filter(([jid]) => jid.endsWith("@g.us"));
}

function getTargetGroups(conn) {
  return getAllGroups(conn).filter(
    ([jid]) => !state.filterGroups.includes(jid),
  );
}

async function sendBroadcast(conn, targetGroups, text) {
  let success = 0;
  let failed = 0;

  for (const [jid] of targetGroups) {
    try {
      await conn.sendMessage(jid, { text });
      success++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { success, failed };
}

function startScheduler(conn) {
  if (state.scheduler) clearInterval(state.scheduler);

  state.scheduler = setInterval(async () => {
    const now = moment().tz(TIMEZONE);
    if (!SCHEDULE_HOURS.includes(now.hour()) || now.minute() !== 0) return;
    if (!state.text) return;

    const targets = getTargetGroups(conn);
    if (!targets.length) return;

    const timeLabel = now.format("HH:mm [WIB]");
    await sendBroadcast(
      conn,
      targets,
      `${state.text}\n\n_Dikirim otomatis pukul ${timeLabel}_`,
    );
  }, 60000);
}

const HELP = `*Broadcast Manager*

*.bc set* <teks> — Atur teks broadcast
*.bc show* — Lihat konfigurasi aktif
*.bc send* — Kirim broadcast sekarang
*.bc list* — Tampilkan semua grup beserta nomor urut
*.bc filter add* <1,2,3> — Tambah grup ke blacklist (tidak menerima broadcast)
*.bc filter remove* <1,2,3> — Hapus grup dari blacklist
*.bc filter list* — Tampilkan grup yang diblacklist
*.bc filter clear* — Hapus semua blacklist
*.bc auto on* — Aktifkan jadwal otomatis (00,03,06,09,12,15,18,21 WIB)
*.bc auto off* — Matikan jadwal otomatis`;

export default {
  name: "broadcast",
  category: "group",
  command: ["bc", "broadcast"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    const [sub, ...rest] = m.args;
    if (!sub) return m.reply(HELP);

    switch (sub.toLowerCase()) {
      case "set": {
        const text = rest.join(" ").trim();
        if (!text)
          return m.reply(
            "Sertakan teks broadcast.\n\nContoh: .bc set Halo semua!",
          );
        state.text = text;
        saveDB();
        return m.reply(
          `Teks broadcast berhasil diset.\n\nPreview:\n${state.text}`,
        );
      }

      case "show": {
        const all = getAllGroups(conn);
        const excluded = state.filterGroups.length;
        const target = all.length - excluded;

        return m.reply(
          `*Konfigurasi Broadcast*\n\n` +
            `Teks        : ${state.text || "(belum diset)"}\n` +
            `Total grup  : ${all.length}\n` +
            `Diblacklist : ${excluded} grup\n` +
            `Target kirim: ${target} grup\n` +
            `Jadwal      : ${state.scheduler ? "Aktif (00, 03, 06, 09, 12, 15, 18, 21 WIB)" : "Nonaktif"}`,
        );
      }

      case "list": {
        const groups = getAllGroups(conn);
        if (!groups.length)
          return m.reply("Bot tidak bergabung di grup manapun.");

        const lines = groups.map(([jid, chat], i) => {
          const name = chat?.subject || "Tanpa Nama";
          const blocked = state.filterGroups.includes(jid) ? " ✗" : "";
          return `${i + 1}. ${name}${blocked}\n   ID: ${jid}`;
        });

        return m.reply(
          `*Daftar Grup (${groups.length})*\n` +
            `Tanda ✗ = diblacklist (tidak menerima broadcast)\n\n` +
            lines.join("\n\n"),
        );
      }

      case "send": {
        if (!state.text)
          return m.reply(
            "Teks broadcast belum diset. Gunakan .bc set <teks> terlebih dahulu.",
          );
        const targets = getTargetGroups(conn);
        if (!targets.length)
          return m.reply("Tidak ada grup target yang tersedia.");

        await m.reply(`Mengirim broadcast ke ${targets.length} grup...`);
        const { success, failed } = await sendBroadcast(
          conn,
          targets,
          state.text,
        );
        return m.reply(
          `Broadcast selesai.\n\nBerhasil : ${success} grup\nGagal    : ${failed} grup`,
        );
      }

      case "filter": {
        const [action, ...filterArgs] = rest;
        if (!action) return m.reply("Gunakan: add, remove, list, atau clear.");

        switch (action.toLowerCase()) {
          case "add": {
            const input = filterArgs.join("").trim();
            if (!input)
              return m.reply(
                "Sertakan nomor urut grup.\n\nContoh: .bc filter add 1,2,5",
              );

            const groups = getAllGroups(conn);
            const indices = input.split(",").map((n) => parseInt(n.trim()) - 1);
            const invalid = indices.filter((i) => i < 0 || i >= groups.length);

            if (invalid.length) {
              return m.reply(
                `Nomor tidak valid: ${invalid.map((i) => i + 1).join(", ")}.\nGunakan .bc list untuk melihat daftar grup.`,
              );
            }

            const added = [];
            for (const i of indices) {
              const [jid, chat] = groups[i];
              if (!state.filterGroups.includes(jid)) {
                state.filterGroups.push(jid);
                added.push(chat?.subject || jid);
              }
            }

            if (!added.length)
              return m.reply("Semua grup yang dipilih sudah ada di blacklist.");

            saveDB();
            return m.reply(
              `${added.length} grup berhasil ditambahkan ke blacklist:\n\n${added.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
            );
          }

          case "remove": {
            const input = filterArgs.join("").trim();
            if (!input)
              return m.reply(
                "Sertakan nomor urut grup.\n\nContoh: .bc filter remove 1,3",
              );

            const groups = getAllGroups(conn);
            const indices = input.split(",").map((n) => parseInt(n.trim()) - 1);
            const invalid = indices.filter((i) => i < 0 || i >= groups.length);

            if (invalid.length) {
              return m.reply(
                `Nomor tidak valid: ${invalid.map((i) => i + 1).join(", ")}.\nGunakan .bc list untuk melihat daftar grup.`,
              );
            }

            const removed = [];
            for (const i of indices) {
              const [jid, chat] = groups[i];
              const idx = state.filterGroups.indexOf(jid);
              if (idx !== -1) {
                state.filterGroups.splice(idx, 1);
                removed.push(chat?.subject || jid);
              }
            }

            if (!removed.length)
              return m.reply("Grup yang dipilih tidak ada di blacklist.");

            saveDB();
            return m.reply(
              `${removed.length} grup berhasil dihapus dari blacklist:\n\n${removed.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
            );
          }

          case "list": {
            if (!state.filterGroups.length)
              return m.reply(
                "Blacklist kosong. Broadcast dikirim ke semua grup.",
              );

            const lines = state.filterGroups.map((jid, i) => {
              const name = conn.chats[jid]?.subject || "Tanpa Nama";
              return `${i + 1}. ${name}\n   ID: ${jid}`;
            });

            return m.reply(
              `*Grup Blacklist (${state.filterGroups.length})*\n\n${lines.join("\n\n")}`,
            );
          }

          case "clear": {
            state.filterGroups = [];
            saveDB();
            return m.reply(
              "Blacklist dihapus. Broadcast akan dikirim ke semua grup.",
            );
          }

          default:
            return m.reply(
              "Aksi tidak dikenal. Gunakan: add, remove, list, atau clear.",
            );
        }
      }

      case "auto": {
        const action = rest[0]?.toLowerCase();

        if (action === "on") {
          if (!state.text)
            return m.reply(
              "Teks broadcast belum diset. Gunakan .bc set <teks> terlebih dahulu.",
            );
          startScheduler(conn);
          return m.reply(
            "Broadcast otomatis diaktifkan.\n\nJadwal: 00.00, 03.00, 06.00, 09.00, 12.00, 15.00, 18.00, 21.00 WIB",
          );
        }

        if (action === "off") {
          if (state.scheduler) {
            clearInterval(state.scheduler);
            state.scheduler = null;
          }
          return m.reply("Broadcast otomatis dinonaktifkan.");
        }

        return m.reply("Gunakan: .bc auto on atau .bc auto off");
      }

      default:
        return m.reply(HELP);
    }
  },
};

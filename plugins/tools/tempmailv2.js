import {
  tmCreate,
  tmMessages,
  tmDomains,
  tmSource,
  tmDownload,
} from "#scrape/tempmail.js";

function getSession(sender) {
  if (!global.db) global.db = {};
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.tempmail) global.db.data.tempmail = {};
  return global.db.data.tempmail[sender] || null;
}

function setSession(sender, data) {
  if (!global.db) global.db = {};
  if (!global.db.data) global.db.data = {};
  if (!global.db.data.tempmail) global.db.data.tempmail = {};
  global.db.data.tempmail[sender] = data;
}

function clearSession(sender) {
  if (global.db?.data?.tempmail) delete global.db.data.tempmail[sender];
}

function formatMessage(msg, i) {
  return (
    `${i + 1}. *${msg.subject || "(No Subject)"}*\n` +
    `   Dari    : ${msg.from || "-"}\n` +
    `   Waktu   : ${msg.created_at ? new Date(msg.created_at * 1000).toLocaleString("id-ID") : "-"}\n` +
    `   ID      : ${msg.id}`
  );
}

export default {
  name: "tempmailv2",
  category: "tools",
  command: [
    "tmcreate",
    "tmcustom",
    "tmbox",
    "tmdomains",
    "tmsource",
    "tmdown",
    "tminfo",
    "tmclear",
  ],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m) => {
    const sender = m.sender;
    const session = getSession(sender);

    if (m.command === "tmcreate") {
      const result = await tmCreate();

      setSession(sender, {
        email: result.email,
        token: result.token,
      });

      return m.reply(
        `Email temporer berhasil dibuat.\n\n` +
          `Email : ${result.email}\n` +
          `Token : ${result.token}\n\n` +
          `Gunakan tmbox untuk cek inbox.\n` +
          `Gunakan tmclear untuk hapus sesi.`,
      );
    }

    if (m.command === "tmcustom") {
      const [username, domain] = (m.text || "").trim().split(/\s+/);

      if (!username) {
        return m.reply(
          "Usage: tmcustom <username> [domain]\n\n" +
            "Contoh:\n" +
            "   tmcustom john\n" +
            "   tmcustom john tempmail.com\n\n" +
            "Gunakan tmdomains untuk lihat domain yang tersedia.",
        );
      }

      const result = await tmCreate({ name: username, domain });

      setSession(sender, {
        email: result.email,
        token: result.token,
      });

      return m.reply(
        `Email custom berhasil dibuat.\n\n` +
          `Email : ${result.email}\n` +
          `Token : ${result.token}`,
      );
    }

    if (m.command === "tmbox") {
      const target = m.text?.trim() || session?.email;

      if (!target) {
        return m.reply(
          "Belum ada email aktif.\n\n" +
            "Buat dulu dengan tmcreate atau tmcustom.\n" +
            "Atau: tmbox email@domain.com",
        );
      }

      const messages = await tmMessages(target);

      if (!messages?.length) {
        return m.reply(
          `Inbox kosong.\n\n` +
            `Email : ${target}\n\n` +
            `Coba lagi beberapa saat atau tunggu email masuk.`,
        );
      }

      const list = messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");

      return m.reply(
        `Inbox: ${target}\n` +
          `Total: ${messages.length} pesan\n\n` +
          `${list}\n\n` +
          `Gunakan tmsource <ID> untuk lihat isi email.\n` +
          `Gunakan tmdown <ID> untuk download .eml`,
      );
    }

    if (m.command === "tmdomains") {
      const result = await tmDomains();
      const list =
        result?.domains?.map((d, i) => `${i + 1}. ${d.name}`).join("\n") ||
        "Tidak ada domain.";

      return m.reply(
        `Domain Tersedia (${result?.domains?.length || 0})\n\n${list}`,
      );
    }

    if (m.command === "tmsource") {
      const msgId = m.text?.trim();
      if (!msgId) return m.reply("Usage: tmsource <message ID>");

      const source = await tmSource(msgId);
      const preview =
        typeof source === "string"
          ? source.slice(0, 3000)
          : JSON.stringify(source, null, 2).slice(0, 3000);

      return m.reply(
        `Source Email\nID: ${msgId}\n\n${preview}${preview.length >= 3000 ? "\n\n[dipotong...]" : ""}`,
      );
    }

    if (m.command === "tmdown") {
      const msgId = m.text?.trim();
      if (!msgId) return m.reply("Usage: tmdown <message ID>");

      const buffer = await tmDownload(msgId);

      await conn.sendMessage(
        m.chat,
        {
          document: buffer,
          mimetype: "message/rfc822",
          fileName: `${msgId}.eml`,
          caption: `Email source\nID: ${msgId}`,
        },
        { quoted: m },
      );

      return;
    }

    if (m.command === "tminfo") {
      if (!session) {
        return m.reply(
          "Belum ada email aktif.\n\nGunakan tmcreate atau tmcustom.",
        );
      }

      return m.reply(
        `Email Aktif\n\n` +
          `Email : ${session.email}\n` +
          `Token : ${session.token}`,
      );
    }

    if (m.command === "tmclear") {
      if (!session) return m.reply("Tidak ada sesi aktif yang perlu dihapus.");
      clearSession(sender);
      return m.reply("Sesi email temporer dihapus.");
    }
  },
};

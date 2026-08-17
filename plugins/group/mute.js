import fs from "fs";
import path from "path";
import { AIRich } from "#helper";

const DB_PATH = "./lib/database/mute.json";

function getMutedGroups() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveMutedGroups(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getAllGroups(conn) {
  const chats = conn.chats || {};
  const groups = [];
  for (const id in chats) {
    if (id.endsWith("@g.us")) {
      groups.push({
        id: id,
        name: chats[id]?.subject || "Unknown",
        participants: chats[id]?.participants?.length || 0,
      });
    }
  }
  return groups;
}

export default {
  name: "mute",
  category: "group",
  command: ["mute", "unmute", "listmute", "mutels", "muted"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const command = m.command;
    const muted = getMutedGroups();
    const groups = getAllGroups(conn);

    if (command === "mutels" || command === "muteall") {
      if (groups.length === 0) {
        return m.reply("Bot tidak join di grup manapun.");
      }

      let text = "📋 *DAFTAR GRUP BOT*\n\n";
      groups.forEach((g, i) => {
        const isMuted = muted.includes(g.id);
        text += `${i + 1}. ${g.name}\n`;
        text += `   ID: ${g.id}\n`;
        text += `   Status: ${isMuted ? "🔇 Muted" : "🔊 Active"}\n`;
        text += `   Anggota: ${g.participants}\n\n`;
      });
      text +=
        "\nCara mute: .mute 1,2,3 (dari list di atas) atau .mute langsung di grup";
      return m.reply(text);
    }

    if (command === "muted" || command === "listmute") {
      if (muted.length === 0) {
        return m.reply("Tidak ada grup yang di-mute.");
      }

      const tableData = [["No", "Nama Grup", "ID Grup"]];

      muted.forEach((id, i) => {
        const group = groups.find((g) => g.id === id);
        const name = group ? group.name : "Unknown (tidak ditemukan)";
        tableData.push([String(i + 1), name, id]);
      });

      await new AIRich(conn)
        .setTitle("🔇 Daftar Grup Mute")
        .setFooter("Total: " + muted.length + " grup")
        .addTable(tableData)
        .send(m.chat, { quoted: m });

      return;
    }

    if (command === "mute") {
      const args = m.args;

      if (groups.length === 0) {
        return m.reply("Bot tidak join di grup manapun.");
      }

      if (groups.length === 1) {
        const group = groups[0];
        if (!muted.includes(group.id)) {
          muted.push(group.id);
          saveMutedGroups(muted);
          return m.reply("🔇 Grup " + group.name + " berhasil di-mute.");
        }
        return m.reply("🔇 Grup " + group.name + " sudah di-mute.");
      }

      if (!args || args.length === 0) {
        if (m.isGroup) {
          if (!muted.includes(m.chat)) {
            muted.push(m.chat);
            saveMutedGroups(muted);
            return m.reply("🔇 Grup ini berhasil di-mute.");
          }
          return m.reply("🔇 Grup ini sudah di-mute.");
        }
        return m.reply(
          "Gunakan: .mute 1,2,3 (dari list .mutels) atau ketik .mute langsung di grup.",
        );
      }

      const indices = args
        .join(",")
        .split(",")
        .map((v) => parseInt(v.trim()) - 1)
        .filter((v) => !isNaN(v) && v >= 0);
      const toMute = indices
        .map((i) => groups[i])
        .filter((g) => g && !muted.includes(g.id));

      if (toMute.length === 0) {
        return m.reply(
          "Tidak ada grup yang bisa di-mute (mungkin sudah di-mute atau index salah).",
        );
      }

      toMute.forEach((g) => {
        if (!muted.includes(g.id)) muted.push(g.id);
      });
      saveMutedGroups(muted);

      const names = toMute.map((g) => g.name).join(", ");
      return m.reply("🔇 Berhasil mute " + toMute.length + " grup:\n" + names);
    }

    if (command === "unmute") {
      const args = m.args;

      if (muted.length === 0) {
        return m.reply("Tidak ada grup yang di-mute.");
      }

      if (muted.length === 1) {
        const id = muted[0];
        const group = groups.find((g) => g.id === id);
        const name = group ? group.name : "Unknown";
        muted.splice(0, 1);
        saveMutedGroups(muted);
        return m.reply("🔊 Grup " + name + " berhasil di-unmute.");
      }

      if (!args || args.length === 0) {
        return m.reply(
          "Gunakan: .unmute 1,2,3 (dari list .muted)\n\nCek list grup yang di-mute dengan .muted",
        );
      }

      const mutedGroups = muted.map((id) => {
        const group = groups.find((g) => g.id === id);
        return group ? group : { id, name: "Unknown" };
      });

      const indices = args
        .join(",")
        .split(",")
        .map((v) => parseInt(v.trim()) - 1)
        .filter((v) => !isNaN(v) && v >= 0);
      const toUnmute = indices
        .map((i) => mutedGroups[i])
        .filter((g) => g && g.id);

      if (toUnmute.length === 0) {
        return m.reply(
          "Tidak ada grup yang bisa di-unmute (mungkin index salah).\n\nCek list dengan .muted",
        );
      }

      toUnmute.forEach((g) => {
        const idx = muted.indexOf(g.id);
        if (idx !== -1) muted.splice(idx, 1);
      });
      saveMutedGroups(muted);

      const names = toUnmute.map((g) => g.name).join(", ");
      return m.reply(
        "🔊 Berhasil unmute " + toUnmute.length + " grup:\n" + names,
      );
    }
  },
};

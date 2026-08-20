import fs from "fs";
import path from "path";

export default {
  name: "sendcmd",
  category: "owner",
  command: ["sendcmd", "scmd"],

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
    let rawText = m.text?.trim() || "";
    let targetJid = null;
    let pathInput = "";

    if (rawText.includes("|")) {
      const parts = rawText.split("|").map((v) => v.trim());
      pathInput = parts[0];
      const number = parts[1]?.replace(/[^0-9]/g, "");
      if (number) targetJid = number + "@s.whatsapp.net";
    } else if (m.mentions && m.mentions.length > 0) {
      targetJid = m.mentions[0];
      pathInput = rawText.replace(/@\d+/g, "").trim();
    } else if (m.isQuoted) {
      targetJid = m.quoted.sender;
      pathInput = rawText;
    } else if (rawText) {
      const parts = rawText.split(/\s+/);
      const lastPart = parts[parts.length - 1]?.replace(/[^0-9]/g, "");
      if (lastPart && lastPart.length >= 5) {
        targetJid = lastPart + "@s.whatsapp.net";
        pathInput = parts.slice(0, -1).join(" ");
      } else {
        pathInput = rawText;
      }
    }

    if (!targetJid) {
      return m.reply(
        "*SEND COMMAND HELP*\n\n" +
          "• *Reply pesan target* : `.sendcmd category/filename`\n" +
          "• *Tag target di grup* : `.sendcmd category/filename @user`\n" +
          "• *Format nomor HP* : `.sendcmd category/filename | 628xxxx`"
      );
    }

    if (!pathInput) {
      return m.reply("Ketik path plugin yang ingin dikirim.\n\nContoh: `.sendcmd group/kick`");
    }

    const cleanPath = pathInput.replace(/\.js$/i, "").replace(/^\.\//, "");
    const pluginPath = path.join(process.cwd(), "plugins", cleanPath + ".js");

    if (!fs.existsSync(pluginPath)) {
      return m.reply(`Plugin *${cleanPath}.js* tidak ditemukan.`);
    }

    try {
      const code = fs.readFileSync(pluginPath, "utf8");
      await conn.sendMessage(targetJid, { text: code });
      return m.reply(`Berhasil mengirim file plugin *${cleanPath}.js* ke *@${targetJid.split("@")[0]}*.`, {
        mentions: [targetJid],
      });
    } catch (err) {
      return m.reply("Gagal mengirim plugin: " + err.message);
    }
  },
};
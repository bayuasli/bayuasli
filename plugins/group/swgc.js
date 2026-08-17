import { getContentType } from "baileys";

export default {
  name: "swgc",
  category: "group",
  command: ["swgc"],
  alias: ["upswgc", "toswgc"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    try {
      if (!m.isQuoted) {
        return m.reply("Reply pesan/media yang mau dikirim ke status grup");
      }

      const quotedMsg = m.quoted?.message;
      if (!quotedMsg) {
        return m.reply("Tidak ada pesan yang di-quote");
      }

      const ct = Object.keys(quotedMsg)[0];
      const mediaMsg = quotedMsg[ct];

      mediaMsg.contextInfo = {
        isGroupStatus: true,
      };

      quotedMsg[ct] = mediaMsg;

      await conn.relayMessage(m.chat, quotedMsg, {});
      return m.reply("Pesan berhasil dikirim ke status grup");
    } catch (err) {
      console.error("SWGC Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

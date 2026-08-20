export default {
  name: "toimg",
  category: "sticker",
  command: ["toimg"],

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
      if (!m.isQuoted || m.quoted.type !== "stickerMessage")
        return m.reply("Reply sticker dulu.");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const buffer = await conn.downloadMediaMessage(m.quoted);
      if (!buffer) return m.reply("Gagal download sticker.");

      await conn.sendMessage(m.chat, { image: buffer }, { quoted: m });
      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await m.reply("Error: " + e.message);
    }
  },
};

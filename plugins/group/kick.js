export default {
  name: "kick",
  category: "group",
  command: ["kick", "dor", "remove"],
  settings: {
    owner: true,
    private: false,
    group: true,
    admin: true,
    botAdmin: true,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    let target = null;

    if (m.mentions && m.mentions.length > 0) {
      target = m.mentions[0];
    } else if (m.isQuoted) {
      target = m.quoted.sender;
    } else if (m.text) {
      const cleaned = m.text.replace(/[^0-9]/g, "");
      if (cleaned.length >= 5) {
        target = cleaned + "@s.whatsapp.net";
      }
    }

    if (!target) {
      return m.reply("Tag member, reply pesannya, atau ketik nomor target yang ingin dikeluarkan.");
    }

    const botJid = conn.getJid(conn.user.id);
    if (target === botJid) {
      return m.reply("Tidak dapat mengeluarkan bot sendiri.");
    }

    try {
      const res = await conn.groupParticipantsUpdate(m.chat, [target], "remove");
      const status = res?.[0]?.status;

      if (status === "200" || status === 200) {
        return m.reply(`Berhasil mengeluarkan *@${target.split("@")[0]}* dari grup.`, { mentions: [target] });
      } else {
        return m.reply(`Gagal mengeluarkan *@${target.split("@")[0]}*.`, { mentions: [target] });
      }
    } catch (err) {
      return m.reply("Terjadi kesalahan saat mengeluarkan member: " + err.message);
    }
  },
};
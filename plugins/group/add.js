export default {
  name: "add",
  category: "group",
  command: ["add", "addmem", "invite"],
  settings: {
    owner: false,
    private: false,
    group: true,
    admin: true,
    botAdmin: true,
    loading: false,
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
      return m.reply("Ketik nomor target yang ingin ditambahkan ke grup.");
    }

    try {
      const res = await conn.groupParticipantsUpdate(m.chat, [target], "add");
      const status = res?.[0]?.status;

      if (status === "200" || status === 200) {
        return m.reply(`Berhasil menambahkan *@${target.split("@")[0]}* ke grup.`, { mentions: [target] });
      } else if (status === "403" || status === 403) {
        const inviteCode = await conn.groupInviteCode(m.chat).catch(() => null);
        if (inviteCode) {
          const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
          return m.reply(`Target *@${target.split("@")[0]}* membatasi undangan grup.\n\nTautan undangan grup:\n${inviteUrl}`, { mentions: [target] });
        }
        return m.reply(`Target *@${target.split("@")[0]}* membatasi undangan grup secara privat.`, { mentions: [target] });
      } else if (status === "409" || status === 409) {
        return m.reply(`Target *@${target.split("@")[0]}* sudah menjadi anggota grup ini.`, { mentions: [target] });
      } else {
        return m.reply(`Gagal menambahkan *@${target.split("@")[0]}* (Status Code: ${status || "Unknown"}).`, { mentions: [target] });
      }
    } catch (err) {
      return m.reply("Terjadi kesalahan saat menambahkan member: " + err.message);
    }
  },
};
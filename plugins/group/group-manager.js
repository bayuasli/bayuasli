export default {
  name: "group-manager",
  category: "group",
  command: ["promote", "demote", "setnamegc", "setdesk", "close", "open"],
  alias: ["pm", "dm", "setname", "setdesc"],
  settings: {
    owner: false,
    private: false,
    group: true,
    admin: true,
    botAdmin: true,
    loading: false,
  },

  run: async (conn, m) => {
    const cmd = m.command.toLowerCase();

    if (cmd === "promote" || cmd === "pm") {
      let target;
      if (m.mentions && m.mentions[0]) {
        target = m.mentions[0];
      } else if (m.isQuoted) {
        target = m.quoted.sender;
      } else if (m.text) {
        let num = m.text.replace(/[^0-9]/g, "");
        if (num.length >= 9) {
          target = num + "@s.whatsapp.net";
        }
      }

      if (!target) {
        return m.reply(`*FORMAT SALAH*\n\n• Tag user, balas pesannya, atau masukkan nomor telepon.`);
      }

      await conn.groupParticipantsUpdate(m.chat, [target], "promote");
      return m.reply(`*PEMBERITAHUAN*\n\n• Berhasil mempromosikan @${target.split("@")[0]} menjadi admin.`, {
        mentions: [target]
      });
    }

    if (cmd === "demote" || cmd === "dm") {
      let target;
      if (m.mentions && m.mentions[0]) {
        target = m.mentions[0];
      } else if (m.isQuoted) {
        target = m.quoted.sender;
      } else if (m.text) {
        let num = m.text.replace(/[^0-9]/g, "");
        if (num.length >= 9) {
          target = num + "@s.whatsapp.net";
        }
      }

      if (!target) {
        return m.reply(`*FORMAT SALAH*\n\n• Tag user, balas pesannya, atau masukkan nomor telepon.`);
      }

      await conn.groupParticipantsUpdate(m.chat, [target], "demote");
      return m.reply(`*PEMBERITAHUAN*\n\n• Berhasil menurunkan jabatan @${target.split("@")[0]} menjadi member biasa.`, {
        mentions: [target]
      });
    }

    if (cmd === "setnamegc" || cmd === "setname") {
      if (!m.text) {
        return m.reply(`*FORMAT SALAH*\n\n• Silakan masukkan nama grup baru.`);
      }
      if (m.text.length > 100) {
        return m.reply(`*PEMBERITAHUAN*\n\n• Nama grup tidak boleh lebih dari 100 karakter.`);
      }
      await conn.groupUpdateSubject(m.chat, m.text);
      return m.reply(`*PEMBERITAHUAN*\n\n• Berhasil mengubah nama grup menjadi *${m.text}*.`);
    }

    if (cmd === "setdesk" || cmd === "setdesc") {
      if (!m.text) {
        return m.reply(`*FORMAT SALAH*\n\n• Silakan masukkan deskripsi grup baru.`);
      }
      await conn.groupUpdateDescription(m.chat, m.text);
      return m.reply(`*PEMBERITAHUAN*\n\n• Berhasil mengubah deskripsi grup.`);
    }

    if (cmd === "close") {
      await conn.groupSettingUpdate(m.chat, "announcement");
      return m.reply(`*PEMBERITAHUAN*\n\n• Grup berhasil *ditutup*. Hanya admin yang dapat mengirim pesan.`);
    }

    if (cmd === "open") {
      await conn.groupSettingUpdate(m.chat, "not_announcement");
      return m.reply(`*PEMBERITAHUAN*\n\n• Grup berhasil *dibuka*. Semua anggota dapat mengirim pesan.`);
    }
  }
};
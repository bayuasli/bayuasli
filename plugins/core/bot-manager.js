export default {
  name: "bot-manager",
  category: "core",
  command: ["setpp", "delpp", "listblock"],
  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (m.command === "setpp") {
      let source = null;

      if (m.quoted?.isMedia) {
        source = await m.quoted.download();
      } else if (m.isMedia) {
        source = await m.download();
      } else if (m.text) {
        source = m.text.trim();
      }

      if (!source) {
        return m.reply(
          "Balas atau kirim foto, atau sertakan link gambar untuk mengganti foto profil bot.",
        );
      }

      const file = await conn.getFile(source);

      if (!/image/i.test(file.mime)) {
        return m.reply("Media yang dikirim bukan gambar.");
      }

      await conn.updateProfilePicture(conn.user.id, file.data);
      return m.reply("Foto profil bot berhasil diperbarui.");
    }

    if (m.command === "delpp") {
      await conn.removeProfilePicture(conn.user.id);
      return m.reply("Foto profil bot berhasil dihapus.");
    }

    if (m.command === "listblock") {
      const blocklist = await conn.fetchBlocklist();

      if (!blocklist.length) {
        return m.reply("Tidak ada nomor yang diblokir.");
      }

      const teks = blocklist
        .map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`)
        .join("\n");

      return m.reply({
        text: `Daftar Nomor Diblokir\n\n${teks}`,
        mentions: blocklist,
      });
    }
  },
};

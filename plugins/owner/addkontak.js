export default {
  name: "kontakmanager",
  category: "owner",
  command: ["svkontak", "delkontak"],
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
    function resolveTarget() {
      if (m.isQuoted) return m.quoted.sender;
      if (m.mentions?.[0]) return m.mentions[0];
      const numberMatch = (m.text || "").match(/\d{8,15}/);
      if (numberMatch) return conn.getJid(numberMatch[0] + "@s.whatsapp.net");
      return null;
    }

    if (m.command === "svkontak") {
      const target = resolveTarget();
      if (!target)
        return m.reply(
          `Contoh:\n${m.prefix}svkontak 628123456789 Nama Kontak\natau reply/tag orang + nama`,
        );

      const name = (m.text || "").replace(/\d{8,15}/, "").trim();
      if (!name) return m.reply("Masukkan nama untuk kontak ini.");

      try {
        await conn.addOrEditContact(target, {
          fullName: name,
          firstName: name,
        });
        return m.reply(
          `Kontak berhasil disimpan:\n${target.split("@")[0]} → ${name}`,
        );
      } catch (e) {
        console.error("[addkontak]", e);
        return m.reply("Gagal menyimpan kontak: " + e.message);
      }
    }

    if (m.command === "delkontak") {
      const target = resolveTarget();
      if (!target)
        return m.reply(
          `Contoh:\n${m.prefix}delkontak 628123456789\natau reply/tag orang`,
        );

      try {
        await conn.removeContact(target);
        return m.reply(`Kontak berhasil dihapus:\n${target.split("@")[0]}`);
      } catch (e) {
        console.error("[delkontak]", e);
        return m.reply("Gagal menghapus kontak: " + e.message);
      }
    }
  },
};

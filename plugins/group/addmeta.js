export default {
  name: "addmeta",
  category: "group",
  command: ["addmeta", "addai"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: true,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    try {
      await conn.groupParticipantsUpdate(
        m.chat,
        ["867051314767696@bot"],
        "add",
      );
      return m.reply("Sukses add Met Gay ke grup");
    } catch (err) {
      console.error(err);
      return m.reply("Gagal menambahkan Met Gay ke grup: " + err.message);
    }
  },
};

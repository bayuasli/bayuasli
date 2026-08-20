export default {
  name: "ping",
  category: "info",
  command: ["ping"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const name = m.pushname || m.name || m.senderName || conn.getName(m.sender) || "kamu";
    return m.reply("wuff! hai " + name);
  },
};
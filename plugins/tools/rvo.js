export default {
  name: "rvo",
  category: "tools",
  command: ["rvo"],
  run: async (conn, m) => {
    if (!m.quoted?.msg?.viewOnce) return m.reply("Not a one-time view media!!");
    m.quoted.msg.viewOnce = false;
    m.reply({ forward: m.quoted, force: true });
  },
};

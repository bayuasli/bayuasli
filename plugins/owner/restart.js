export default {
  name: "restart",
  category: "owner",
  command: ["restart"],
  settings: { owner: true },

  run: async (conn, m) => {
    m.reply("Restarting...");
    setTimeout(() => process.exit(0), 1500);
  },
};

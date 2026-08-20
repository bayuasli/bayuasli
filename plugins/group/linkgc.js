export default {
  name: "linkgc",
  category: "group",
  command: ["link", "linkgc"],
  settings: {
    group: true,
    botAdmin: true,
  },
  run: async (conn, m) => {
    m.reply(
      "https://chat.whatsapp.com/" + (await conn.groupInviteCode(m.chat)),
    );
  },
};

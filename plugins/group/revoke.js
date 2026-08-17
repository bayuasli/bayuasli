export default {
  name: "revoke",
  category: "group",
  command: ["revoke", "resetlink"],
  settings: {
    group: true,
    admin: true,
    botAdmin: true,
  },
  run: async (conn, m) => {
    m.reply(
      "Berhasil Reset linkgc\n\n Link : https://chat.whatsapp.com/" +
        (await conn.groupRevokeInvite(m.chat)),
    );
  },
};

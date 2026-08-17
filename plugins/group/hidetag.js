export default {
  name: "hidetag",
  category: "group",
  command: ["hidetag", "ht"],
  alias: [],

  settings: {
    owner: true,
    group: true,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { metadata }) => {
    let text = "";

    if (m.quoted && m.quoted.body) {
      text = m.quoted.body;
    } else if (m.body && m.body.trim()) {
      const args = m.body.trim().split(/ +/);
      args.shift();
      text = args.join(" ");
    }

    if (!text) {
      return m.reply("Masukkan teks atau balas pesan lalu ketik command ini.");
    }

    const mentions = metadata.participants.map((p) => p.id);

    await conn.sendMessage(m.chat, { text, mentions }, { quoted: m });
  },
};

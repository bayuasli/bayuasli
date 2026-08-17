export default {
  name: "emojimix",
  category: "sticker",
  command: ["emojimix"],
  alias: ["emix"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (!m.text || !m.text.includes("+")) {
      return m.reply("Contoh:\n.emix 😏+🤤");
    }

    const [emoji1, emoji2] = m.text.split("+").map((e) => e.trim());
    if (!emoji1 || !emoji2) return m.reply("Contoh:\n.emix 😏+🤤");

    const url = `https://emojik.vercel.app/s/${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}?size=256`;

    const res = await fetch(url);
    if (!res.ok)
      return m.reply("Kombinasi emoji itu tidak tersedia, coba emoji lain.");

    const buffer = Buffer.from(await res.arrayBuffer());

    const exif = { packname: global.stickpack, packpublish: global.stickauth };
    await conn.sendSticker(m.chat, buffer, m, exif);
  },
};

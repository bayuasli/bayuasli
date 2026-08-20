import axios from "axios";

export default {
  name: "quotechat",
  category: "sticker",
  command: ["qc", "quotechat", "quote"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const text = m.text?.trim();
    if (!text) return m.reply("Masukkan teks yang ingin dijadikan quote.");

    const target = m.isQuoted ? m.quoted.sender : m.sender;

    const [username, avatar] = await Promise.all([
      Promise.resolve(
        m.isQuoted
          ? (await conn.getName(target)) || target.split("@")[0]
          : m.pushname || m.sender.split("@")[0],
      ),
      conn
        .profilePictureUrl(target, "image")
        .catch(() => "https://telegra.ph/file/6880771a42bad09dd6087.jpg"),
    ]);

    const payload = {
      type: "quote",
      format: "png",
      backgroundColor: "#fffff",
      width: 512,
      height: 768,
      scale: 2,
      messages: [
        {
          entities: [],
          avatar: true,
          from: {
            id: 1,
            name: username,
            photo: { url: avatar },
          },
          text,
          replyMessage: {},
        },
      ],
    };

    try {
      const res = await axios.post(
        "https://bot.lyo.su/quote/generate",
        payload,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      const buffer = Buffer.from(res.data.result.image, "base64");

      return conn.sendSticker(m.chat, buffer, m, {
        packname: global.stickpack,
        author: global.stickauth,
      });
    } catch (err) {
      return m.reply(
        "Gagal membuat quote: " + (err?.response?.data?.message || err.message),
      );
    }
  },
};

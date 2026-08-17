import Func from "#lib/system/function.js";

export default {
  name: "ptv",
  category: "converter",
  command: ["ptv", "toptv"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const quoted = m.quoted || m.q;
    const text = m.text?.trim() || "";
    let videoBuffer = null;

    if (quoted?.isMedia) {
      const mime = quoted.msg?.mimetype || "";
      if (!/video/i.test(mime)) {
        return m.reply("Pesan yang di-reply harus berupa video.");
      }
      try {
        videoBuffer = await quoted.download();
      } catch (e) {
        return m.reply("Gagal mengunduh video: " + e.message);
      }
    } else if (m.isMedia && /video/i.test(m.msg?.mimetype || "")) {
      try {
        videoBuffer = await m.download();
      } catch (e) {
        return m.reply("Gagal mengunduh video: " + e.message);
      }
    } else if (text) {
      const urlMatch = text.match(/https?:\/\/[^\s]+/g);
      if (urlMatch && urlMatch[0]) {
        try {
          videoBuffer = await Func.getBuffer(urlMatch[0]);
        } catch (e) {
          return m.reply("Gagal mengunduh video dari tautan: " + e.message);
        }
      }
    }

    if (!videoBuffer) {
      return m.reply(
        "*PUSH TO VIDEO (PTV)*\n\n" +
          "Cara Penggunaan:\n" +
          "• Reply video dengan `.ptv`\n" +
          "• Ketik `.ptv <link_video>`"
      );
    }

    try {
      await conn.sendMessage(
        m.chat,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          ptv: true,
        },
        { quoted: m }
      );
    } catch (e) {
      return m.reply("Gagal mengirimkan PTV: " + e.message);
    }
  },
};
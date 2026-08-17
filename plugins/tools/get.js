import fetch from "node-fetch";
import util from "util";

export default {
  name: "get",
  category: "tools",
  command: ["get"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, context) => {
    const { quoted } = context;
    const text = m.text || quoted?.text || "";

    if (!/^https?:\/\//.test(text)) {
      return m.reply(`Cara: .get https://example.com`);
    }

    try {
      await conn.sendMessage(m.chat, {
        react: { text: "👿", key: m.key },
      });

      const response = await fetch(text);
      const contentLength = response.headers.get("content-length");

      if (contentLength > 100 * 1024 * 1024) {
        throw new Error(`File terlalu besar: ${contentLength} bytes`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.startsWith("image/")) {
        return conn.sendMessage(
          m.chat,
          {
            image: { url: text },
          },
          { quoted: m },
        );
      }

      if (contentType?.startsWith("video/")) {
        return conn.sendMessage(
          m.chat,
          {
            video: { url: text },
          },
          { quoted: m },
        );
      }

      if (contentType?.startsWith("audio/")) {
        return conn.sendMessage(
          m.chat,
          {
            audio: { url: text },
            mimetype: "audio/mpeg",
            ptt: true,
          },
          { quoted: m },
        );
      }

      const buffer = await response.buffer();
      let result;

      try {
        const jsonStr = buffer.toString().trim();
        if (jsonStr.startsWith("{") || jsonStr.startsWith("[")) {
          result = util.format(JSON.parse(jsonStr));
        } else {
          result = buffer.toString();
        }
      } catch {
        result = buffer.toString();
      }

      await m.reply(result.slice(0, 65536));
    } catch (err) {
      m.reply(`Gagal: ${err.message}`);
    }
  },
};

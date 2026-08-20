import axios from "axios";
import { generateWAMessage, generateWAMessageFromContent } from "baileys";

async function searchPinterest(query) {
  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?data=${encodeURIComponent(JSON.stringify({ options: { query } }))}`;
  const res = await axios.head(url, {
    headers: {
      "screen-dpr": "4",
      "x-pinterest-pws-handler": "www/search/[scope].js",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    timeout: 15000,
    validateStatus: () => true,
  });

  const linkHeader = res.headers["link"] || "";
  return [...linkHeader.matchAll(/<(https:\/\/i\.pinimg\.com\/[^>]+)>/g)].map(
    (m) => m[1],
  );
}

export default {
  name: "pinterest",
  category: "downloader",
  command: ["pinterest", "pin"],
  alias: ["ptrs"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    try {
      const input = m.text.trim();
      if (!input)
        return m.reply(
          "Cara: .pin <kata kunci> <jumlah>\nContoh: .pin gojo satoru 5",
        );

      const matchLimit = input.match(/(\d+)$/);
      const limit = matchLimit ? Math.min(parseInt(matchLimit[1]), 20) : 5;
      const query = matchLimit ? input.replace(/\d+$/, "").trim() : input;

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const results = await searchPinterest(query);
      if (!results.length) return m.reply("Tidak ada hasil ditemukan.");

      const urls = results.slice(0, limit);

      const medias = [];
      for (const url of urls) {
        try {
          const buffer = await Func.getBuffer(url);
          medias.push({ image: buffer });
        } catch {
          continue;
        }
      }

      if (!medias.length) return m.reply("Gagal mengambil gambar.");

      if (medias.length === 1) {
        await conn.sendMessage(
          m.chat,
          { image: medias[0].image },
          { quoted: m },
        );
        await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
        return;
      }

      await conn.sendAlbumMessage(m.chat, medias, { quoted: m });
      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

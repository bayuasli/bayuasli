import axios from "axios";
import * as cheerio from "cheerio";

async function ttdown(url) {
  if (!url.includes("tiktok.com")) throw new Error("URL tidak valid.");

  const { data: html, headers } = await axios.get("https://musicaldown.com/en");
  const $ = cheerio.load(html);

  const payload = {};
  $("#submit-form input").each((i, elem) => {
    const name = $(elem).attr("name");
    const value = $(elem).attr("value");
    if (name) payload[name] = value || "";
  });

  const urlField = Object.keys(payload).find((key) => !payload[key]);
  if (urlField) payload[urlField] = url;

  const { data } = await axios.post(
    "https://musicaldown.com/download",
    new URLSearchParams(payload).toString(),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        cookie: headers["set-cookie"].join("; "),
        origin: "https://musicaldown.com",
        referer: "https://musicaldown.com/",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      },
    },
  );

  const $$ = cheerio.load(data);
  const downloads = [];
  $$("a.download").each((i, elem) => {
    const $elem = $$(elem);
    downloads.push({
      type: $elem.data("event")?.replace("_download_click", ""),
      label: $elem.text().trim(),
      url: $elem.attr("href"),
    });
  });

  return {
    title: $$(".video-desc").text().trim(),
    author: $$(".video-author b").text().trim(),
    downloads,
  };
}

export default {
  name: "ttsearch",
  category: "downloader",
  command: ["ttsearch", "tts"],

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
      const query = m.text.trim();
      if (!query)
        return m.reply("Masukkan kata kunci.\nContoh: .ttsearch chess jj kece");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const res = await axios({
        method: "POST",
        url: "https://tikwm.com/api/feed/search",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: "current_language=en",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
        data: { keywords: query, count: 10, cursor: 0, HD: 1 },
        timeout: 30000,
      });

      const videos = res.data.data.videos;
      if (!videos || !videos.length)
        throw new Error("Tidak ada video ditemukan.");

      const first = videos[0];
      const tiktokUrl = `https://www.tiktok.com/@${first.author.unique_id}/video/${first.video_id}`;

      const result = await ttdown(tiktokUrl);
      const noWatermark =
        result.downloads.find((d) => /no watermark/i.test(d.label)) ||
        result.downloads.find((d) => d.type === "mp4") ||
        result.downloads[0];

      if (!noWatermark?.url) throw new Error("Gagal ambil link download.");

      const buffer = await Func.getBuffer(noWatermark.url);

      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          caption: `*${result.title || first.title || "No Title"}*\n@${result.author || first.author.nickname}`,
          mimetype: "video/mp4",
        },
        { quoted: m },
      );

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

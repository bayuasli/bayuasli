import axios from "axios";
import * as cheerio from "cheerio";

async function ttdown(url) {
  if (!url.includes("tiktok.com"))
    throw new Error("URL tidak valid, harus link TikTok.");

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
  const bgImage = $$(".video-header").attr("style");
  const coverMatch = bgImage?.match(/url\((.*?)\)/);

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
    author: {
      username: $$(".video-author b").text().trim(),
      avatar: $$(".img-area img").attr("src"),
    },
    cover: coverMatch ? coverMatch[1] : null,
    downloads,
  };
}

export default {
  name: "tiktok",
  category: "downloader",
  command: ["tiktok", "tt"],

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
      const url = m.text.trim();
      if (!url)
        return m.reply(
          "Masukkan link TikTok.\nContoh: .tt https://tiktok.com/@user/video/xxx",
        );

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const result = await ttdown(url);
      if (!result.downloads.length)
        throw new Error("Gagal ambil link download.");

      const noWatermark = result.downloads.find(
        (d) => d.type === "mp4" && /no watermark/i.test(d.label),
      );
      const video =
        noWatermark ||
        result.downloads.find((d) => d.type === "mp4") ||
        result.downloads[0];
      const audio = result.downloads.find((d) => d.type === "mp3");

      const caption =
        `*${result.title || "TikTok Video"}*\n` +
        `Author : @${result.author?.username || "-"}`;

      const buffer = await Func.getBuffer(video.url);

      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          caption,
          mimetype: "video/mp4",
        },
        { quoted: m },
      );

      if (audio) {
        const audioBuffer = await Func.getBuffer(audio.url);
        await conn.sendMessage(
          m.chat,
          {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${result.title || "audio"}.mp3`,
          },
          { quoted: m },
        );
      }

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

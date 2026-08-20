import { igdl } from "#scrape/instashadow.js";

export default {
  name: "instagram",
  category: "downloader",
  command: ["igdl", "ig", "reels"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m, { Func }) => {
    const url = m.text?.trim();

    if (!url || !/instagram\.com/.test(url)) {
      return m.reply(
        "Kirim link Instagram yang valid.\n\n" +
          "Support: Reels, Post, Stories",
      );
    }

    const items = await igdl(url);

    if (!items?.length) {
      return m.reply(
        "Gagal mengambil media. Pastikan link valid dan tidak private.",
      );
    }

    for (const item of items) {
      const caption =
        (item.caption ? item.caption + "\n\n" : "") +
        (item.like_count ? `❤️ ${item.like_count}` : "") +
        (item.comment_count ? `  💬 ${item.comment_count}` : "") +
        (item.publish_date ? `\n🕐 ${item.publish_date}` : "");

      if (item.video_url) {
        const buffer = await Func.getBuffer(item.video_url);
        await conn.sendMessage(
          m.chat,
          {
            video: buffer,
            caption: caption.trim(),
            mimetype: "video/mp4",
          },
          { quoted: m },
        );
      } else if (item.image_url) {
        const buffer = await Func.getBuffer(item.image_url);
        await conn.sendMessage(
          m.chat,
          {
            image: buffer,
            caption: caption.trim(),
          },
          { quoted: m },
        );
      }

      if (items.length > 1) await new Promise((r) => setTimeout(r, 1000));
    }
  },
};

import { youtubeSearch } from "#scrape/yts.js";

export default {
  name: "yt-search",
  category: "downloader",
  command: ["yts", "ytsearch"],
  alias: ["yt"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    try {
      if (!m.text) {
        return m.reply("YouTube Search\n\nUsage: .yts <query>");
      }

      const result = await youtubeSearch(m.text);

      if (!result.success) {
        return m.reply("Error: " + result.error);
      }

      let text = "YOUTUBE SEARCH\n\n";
      const videos = result.results.slice(0, 10);

      for (const video of videos) {
        text += "• " + video.title + "\n";
        text += "  Uploader: " + (video.author?.name || "Unknown") + "\n";
        text += "  Duration: " + (video.duration || "N/A") + "\n";
        text += "  URL: " + video.url + "\n\n";
      }

      return m.reply(text);
    } catch (err) {
      console.error("YouTube Search Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

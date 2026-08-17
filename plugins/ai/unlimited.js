import { unlimitedChat } from "#scrape/unlimitedai.js";

export default {
  name: "unlimited",
  category: "ai",
  command: ["unlimited"],
  alias: ["ul"],
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
        return m.reply("Unlimited AI\n\nUsage: .unlimited <question>");
      }

      const result = await unlimitedChat(m.text);

      if (!result.status) {
        return m.reply("Error: " + result.error);
      }

      const responseText =
        result.answer.length > 4096
          ? result.answer.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : result.answer;

      return m.reply(responseText);
    } catch (err) {
      console.error("Unlimited Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

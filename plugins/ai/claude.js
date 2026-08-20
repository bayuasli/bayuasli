import { claudeHaiku } from "#scrape/claude.js";

const sessions = new Map();

export default {
  name: "claude",
  category: "ai",
  command: ["claude"],
  alias: ["haiku"],
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
        return m.reply(
          "Claude Haiku\n\nUsage: .claude <question>\n\nContoh: .claude apa itu javascript",
        );
      }

      const chatId = sessions.get(m.sender);
      const result = await claudeHaiku(m.text, { chatId });

      if (!result.status) {
        return m.reply("Error: " + result.error);
      }

      sessions.set(m.sender, result.chatId);

      const responseText =
        result.answer.length > 4096
          ? result.answer.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : result.answer;

      return m.reply(
        "Claude Haiku\nModel: " + result.model + "\n\n" + responseText,
      );
    } catch (err) {
      console.error("Claude Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

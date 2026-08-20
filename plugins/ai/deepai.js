import { deepAIChat } from "#scrape/deepai.js";

export default {
  name: "deepai",
  category: "ai",
  command: ["deepai"],
  alias: ["dai"],
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
        return m.reply("DeepAI\n\nUsage: .deepai <question>");
      }

      const result = await deepAIChat(m.text);

      if (!result.success) {
        return m.reply("Error: " + result.error);
      }

      const responseText =
        result.response.length > 4096
          ? result.response.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : result.response;

      return m.reply(responseText);
    } catch (err) {
      console.error("DeepAI Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

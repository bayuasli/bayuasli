import { kimiChat } from "#scrape/kimi.js";

export default {
  name: "kimi",
  category: "ai",
  command: ["kimi"],
  alias: ["kimi-ai"],
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
      const prompt = m.text || "";
      if (!prompt) {
        return m.reply(
          "Kimi AI\n\n" +
            "Usage: .kimi <question>\n" +
            "Model: moonshotai/Kimi-K2.7-Code",
        );
      }

      const result = await kimiChat(prompt);

      if (!result.success) {
        const errMsg =
          typeof result.error === "object"
            ? JSON.stringify(result.error)
            : result.error;
        return m.reply("Error: " + errMsg);
      }

      const responseText =
        result.response.length > 4096
          ? result.response.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : result.response;

      return m.reply(
        "Kimi AI\n" + "Model: " + result.model + "\n\n" + responseText,
      );
    } catch (err) {
      console.error("Kimi AI Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

import { groqChat, resetGroqSession } from "#scrape/groq.js";

export default {
  name: "groq",
  category: "ai",
  command: ["groq"],
  alias: ["g"],
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
          "Groq AI\n\nUsage: .groq <question>\n\nContoh: .groq apa itu javascript",
        );
      }

      if (m.text.toLowerCase() === "reset") {
        resetGroqSession(m.sender);
        return m.reply("Session reset");
      }

      const reply = await groqChat(m.sender, m.text);

      const responseText =
        reply.length > 4096
          ? reply.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : reply;

      return m.reply(responseText);
    } catch (err) {
      console.error("Groq Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

import { gpt } from "#scrape/surfsense.js";

export default {
  name: "cgpt",
  category: "ai",
  command: ["cgpt", "gpt"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const prompt = m.text?.trim();

    if (!prompt) {
      return m.reply("Usage: cgpt <pertanyaan>");
    }

    const result = await gpt(prompt);

    if (!result?.trim()) {
      return m.reply("Tidak ada respons dari model.");
    }

    await m.reply(result);
  },
};

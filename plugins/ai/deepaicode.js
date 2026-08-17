import { getUsableModels, askDeepAI } from "#scrape/deepai.js";

const modelCache = { models: null, timestamp: 0 };

async function getModels() {
  const now = Date.now();
  if (modelCache.models && now - modelCache.timestamp < 60000) {
    return modelCache.models;
  }
  modelCache.models = await getUsableModels();
  modelCache.timestamp = now;
  return modelCache.models;
}

export default {
  name: "deepcode",
  category: "ai",
  command: ["deepcode", "aicode", "depcode"],
  alias: ["dc"],
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
        const models = await getModels();
        const list = models
          .slice(0, 10)
          .map((m, i) => i + 1 + ". " + m.name + " (" + m.id + ")")
          .join("\n");
        return m.reply(
          "DeepCode AI\n\n" +
            "Usage: .deepcode <question>\n" +
            "Model tersedia:\n" +
            list +
            (models.length > 10
              ? "\n... dan " + (models.length - 10) + " lainnya"
              : "") +
            "\n\nGunakan: .deepcode <model> | <question>",
        );
      }

      const models = await getModels();
      let model = models[0]?.id || "standard";
      let prompt = m.text;

      if (m.text.includes("|")) {
        const parts = m.text.split("|").map((s) => s.trim());
        const found = models.find(
          (m) =>
            m.id === parts[0] ||
            m.name.toLowerCase().includes(parts[0].toLowerCase()),
        );
        if (found) {
          model = found.id;
          prompt = parts.slice(1).join("|").trim();
        }
      }

      const history = [{ role: "user", content: prompt }];
      const answer = await askDeepAI(model, history);

      const responseText =
        answer.length > 4096
          ? answer.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : answer;

      return m.reply("DeepCode\nModel: " + model + "\n\n" + responseText);
    } catch (err) {
      console.error("DeepCode Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

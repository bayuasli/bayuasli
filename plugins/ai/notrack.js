import axios from "axios";

const COOKIE =
  "si_usr_id=54MKqMzC_10GRwc; si_ses_id=54MKqMzC_10GRwc; uid=6cfe2d14-d522-4ee9-b135-deb9a0dbc9ec";
const HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,id;q=0.8",
  cookie: COOKIE,
  origin: "https://notrack.ai",
  referer: "https://notrack.ai/chat",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
};

const MODELS = { B: "ChatGPT", C: "NoTrack AI", A: "Minimax" };

async function notrackChat(prompt, model = "B") {
  const payload = {
    attachments: [],
    chat_id: null,
    edit: false,
    edit_mid: null,
    max_turns: 2,
    mode: "usual",
    model: model,
    persona: "normal",
    regenerate: false,
    user_input: prompt,
  };

  try {
    const response = await axios.post(
      "https://notrack.ai/api/dispatch",
      payload,
      {
        headers: { ...HEADERS, "content-type": "application/json" },
        responseType: "stream",
        timeout: 120000,
      },
    );

    return new Promise((resolve, reject) => {
      let fullText = "";
      response.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            try {
              const dataObj = JSON.parse(jsonStr);
              if (dataObj.type === "delta" && dataObj.delta)
                fullText += dataObj.delta;
              if (dataObj.type === "message" && dataObj.content)
                fullText = dataObj.content;
            } catch (e) {}
          }
        }
      });
      response.data.on("end", () =>
        resolve({ success: true, response: fullText }),
      );
      response.data.on("error", (err) => reject(err));
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  name: "notrack",
  category: "ai",
  command: ["notrack"],
  alias: ["nt"],
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
        const modelList = Object.entries(MODELS)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        return m.reply(
          "NoTrack AI\n\nUsage: .notrack <question>\nModel: " +
            modelList +
            "\nDefault: ChatGPT (B)\n\nContoh: .notrack apa itu javascript",
        );
      }

      let model = "B";
      let prompt = m.text;
      if (m.text.includes("|")) {
        const parts = m.text.split("|").map((s) => s.trim());
        const modelMap = { C: "C", B: "B", A: "A" };
        if (modelMap[parts[parts.length - 1]]) {
          model = modelMap[parts[parts.length - 1]];
          prompt = parts.slice(0, -1).join("|").trim();
        }
      }

      const result = await notrackChat(prompt, model);
      if (!result.success) return m.reply("Error: " + result.error);

      const responseText =
        result.response.length > 4096
          ? result.response.slice(0, 4096) + "\n\n... (pesan terpotong)"
          : result.response;
      return m.reply(
        "NoTrack AI\nAgent: " + MODELS[model] + "\n\n" + responseText,
      );
    } catch (err) {
      console.error("NoTrack Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

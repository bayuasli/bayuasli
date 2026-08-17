import axios from "axios";

const API_URL = "http://43.167.6.179:3456/v1/chat/completions";
const API_KEY =
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const MODEL = "moonshotai/Kimi-K2.7-Code";

export async function kimiChat(prompt, options = {}) {
  try {
    const payload = {
      model: options.model || MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: options.stream || false,
    };

    if (options.history && options.history.length > 0) {
      payload.messages = [
        ...options.history,
        { role: "user", content: prompt },
      ];
    }

    const { data } = await axios.post(API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      timeout: options.timeout || 60000,
    });

    const response =
      data?.choices?.[0]?.message?.content || data?.response || "";

    return {
      success: true,
      response: response,
      model: data?.model || MODEL,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
      status: err.response?.status,
    };
  }
}

export async function kimiStream(prompt, onChunk) {
  try {
    const payload = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
    };

    const response = await axios.post(API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      responseType: "stream",
      timeout: 120000,
    });

    return new Promise((resolve, reject) => {
      let fullText = "";

      response.data.on("data", (chunk) => {
        try {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                if (onChunk) onChunk(content);
              }
            }
          }
        } catch (err) {
          reject(err);
        }
      });

      response.data.on("end", () => {
        resolve({
          success: true,
          response: fullText,
          model: MODEL,
        });
      });

      response.data.on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

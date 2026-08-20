import axios from "axios";

export async function gpt(prompt) {
  const { data: stream } = await axios({
    method: "POST",
    url: "https://api.surfsense.com/api/v1/public/anon-chat/stream",
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      model_slug: "gpt-5.4-mini-no-login",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    let buffer = "";
    let text = "";

    stream.on("data", (chunk) => {
      buffer += chunk.toString();

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (let line of lines) {
        line = line.trim();
        if (!line.startsWith("data:")) continue;

        const raw = line.slice(5).trim();
        if (raw === "[DONE]") return resolve(text);

        try {
          const json = JSON.parse(raw);
          if (json.type === "text-delta") text += json.delta;
        } catch {}
      }
    });

    stream.on("end", () => resolve(text));
    stream.on("error", reject);
  });
}

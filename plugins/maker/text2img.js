import crypto from "crypto";
import { WebSocket } from "ws";

export default {
  name: "text2img",
  category: "maker",
  command: ["text2img", "t2img"],
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
      return m.reply(
        "Masukkan prompt untuk generate gambar.\nContoh: .freegen a cute cat sitting on a moon",
      );
    }

    try {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
      const signer = "https://prompt-signer.freegen.app";
      const generator = "https://image-generator.freegen.app";
      const wsUrl = "wss://websocket-bridge.freegen.app/ws";

      const makeAuth = (jobId) => {
        const ts = Math.floor(Date.now() / 1000);
        const msg = jobId + ts;
        const hash = crypto.createHash("sha256").update(msg).digest("hex");
        const b64 = Buffer.from(hash, "utf8")
          .toString("base64")
          .substring(0, 20);
        return b64 + ":" + ts;
      };

      const sign = async (p) => {
        const r = await fetch(signer, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": ua,
            origin: "https://freegen.app",
            referer: "https://freegen.app/",
          },
          body: JSON.stringify({ prompt: p }),
        });
        if (!r.ok) throw new Error("signer " + r.status);
        return await r.json();
      };

      const submit = async (p, ratio) => {
        const { ts, sig } = await sign(p);
        const r = await fetch(generator, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": ua,
            origin: "https://freegen.app",
            referer: "https://freegen.app/",
          },
          body: JSON.stringify({ prompt: p, ts, sig, ratio_id: ratio }),
        });
        if (!r.ok) throw new Error("generator " + r.status);
        return await r.json();
      };

      const waitResult = (jobId) => {
        return new Promise((resolve, reject) => {
          const auth = makeAuth(jobId);
          const ws = new WebSocket(wsUrl, {
            headers: { origin: "https://freegen.app", "user-agent": ua },
          });
          const timer = setTimeout(() => {
            try {
              ws.close();
            } catch {}
            reject(new Error("timeout"));
          }, 300000);
          ws.on("open", () => {
            ws.send(JSON.stringify({ type: "subscribe", job_id: jobId, auth }));
          });
          ws.on("message", (raw) => {
            const m = JSON.parse(raw.toString());
            if (m.type === "status") return;
            if (m.type === "result") {
              clearTimeout(timer);
              try {
                ws.close();
              } catch {}
              resolve({ ok: true, image: m.image_data });
            } else if (m.type === "error") {
              clearTimeout(timer);
              try {
                ws.close();
              } catch {}
              resolve({ ok: false, error: m.message || "unknown" });
            }
          });
          ws.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
          });
        });
      };

      const job = await submit(prompt, "1:1");
      if (!job.job_id) {
        return m.reply("Gagal submit prompt: " + JSON.stringify(job));
      }

      const res = await waitResult(job.job_id);
      if (!res.ok) {
        return m.reply("Gagal generate: " + (res.error || "unknown error"));
      }

      let base64Data = res.image;
      if (base64Data.startsWith("data:image")) {
        base64Data = base64Data.split(",")[1];
      }
      base64Data = base64Data.trim();

      const imageBuffer = Buffer.from(base64Data, "base64");
      if (imageBuffer.length === 0) throw new Error("Buffer kosong");

      await conn.sendMessage(
        m.chat,
        { image: imageBuffer, caption: "Prompt: " + prompt },
        { quoted: m },
      );
    } catch (e) {
      console.error("[freegen]", e);
      return m.reply("Error: " + e.message);
    }
  },
};

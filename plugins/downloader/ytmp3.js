import axios from "axios";

async function ytmp3(ytUrl) {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    origin: "https://ssvid.cc",
    referer: "https://ssvid.cc/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  };

  const initRes = await axios.post(
    "https://hub.convert1s.com/api/download",
    {
      url: ytUrl,
      audio: { bitrate: "128k" },
      output: { type: "audio", format: "mp3" },
    },
    { headers },
  );

  const { statusUrl, title, duration } = initRes.data;

  if (!statusUrl) {
    throw new Error("Gagal mendapatkan statusUrl dari server.");
  }

  let isCompleted = false;
  let downloadData = null;
  let retries = 0;
  const maxRetries = 120;

  while (!isCompleted) {
    if (retries >= maxRetries) {
      throw new Error("Timeout: proses konversi terlalu lama.");
    }

    const statusRes = await axios.get(statusUrl, { headers });

    if (statusRes.data.status === "completed") {
      isCompleted = true;
      downloadData = statusRes.data;
    } else if (
      statusRes.data.status === "failed" ||
      statusRes.data.status === "error"
    ) {
      throw new Error("Konversi gagal di server.");
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      retries++;
    }
  }

  return {
    title: downloadData.title || title,
    duration: downloadData.duration || duration,
    downloadUrl: downloadData.downloadUrl,
  };
}

function sanitizeFileName(name) {
  return (name || "audio").replace(/[\\/:*?"<>|]/g, "").slice(0, 100);
}

export default {
  name: "ytmp3",
  category: "downloader",
  command: ["ytmp3"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m) => {
    const url = (m.text || "").trim();

    if (!url) {
      return m.reply(`Contoh:\n${m.prefix}ytmp3 https://youtu.be/xxxxxxxxxxx`);
    }

    try {
      const result = await ytmp3(url);

      const fileRes = await axios.get(result.downloadUrl, {
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(fileRes.data);
      const fileName = `${sanitizeFileName(result.title)}.mp3`;

      await conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: "audio/mp4",
          fileName,
          caption: `🎵 ${result.title}\n⏱️ Durasi: ${result.duration || "-"}`,
        },
        { quoted: m },
      );
    } catch (e) {
      console.error("[ytmp3]", e);
      return m.reply(`Gagal download: ${e.message}`);
    }
  },
};

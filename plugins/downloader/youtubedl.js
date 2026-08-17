import axios from "axios";

class Ytmp3Scraper {
  constructor() {
    this.baseUrl = "https://a.ymcdn.org/api/v1";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://id.ytmp3.mobi/",
    };
  }

  extractVideoId(url) {
    let match;
    if (url.includes("youtube.com/shorts/") || url.includes("youtu.be/")) {
      match = /\/([a-zA-Z0-9\-_]{11})/.exec(url);
    } else if (url.includes("youtube.com")) {
      match = /v=([a-zA-Z0-9\-_]{11})/.exec(url);
    }
    return match ? match[1] : null;
  }

  async init() {
    const url = `${this.baseUrl}/init?p=y&23=1llum1n471&_=${Math.random()}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async convert(convertURL, videoId, format) {
    const url = `${convertURL}&v=${videoId}&f=${format}&_=${Math.random()}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async checkProgress(progressURL, maxRetries = 60) {
    let retries = 0;
    let lastResponse = null;

    while (retries < maxRetries) {
      const response = await axios.get(progressURL, { headers: this.headers });
      lastResponse = response.data;

      if (lastResponse.error !== 0) {
        throw new Error(`Progress Error Code: ${lastResponse.error}`);
      }

      if (lastResponse.progress === 3) {
        return lastResponse;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }
    throw new Error("Timeout: Konversi memakan waktu terlalu lama.");
  }

  async scrape(youtubeUrl, format = "mp3") {
    const startTime = Date.now();

    try {
      if (!["mp3", "mp4"].includes(format)) {
        return {
          success: false,
          error: "FORMAT_INVALID",
          message: 'Format tidak valid. Gunakan "mp3" atau "mp4".',
        };
      }

      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        return {
          success: false,
          error: "INVALID_URL",
          message: "URL YouTube tidak valid atau Video ID tidak ditemukan.",
        };
      }

      const initResponse = await this.init();
      if (initResponse.error !== 0) {
        return {
          success: false,
          error: "INIT_FAILED",
          message: `Gagal inisialisasi. Error code: ${initResponse.error}`,
          raw: { init: initResponse },
        };
      }

      const convertResponse = await this.convert(
        initResponse.convertURL,
        videoId,
        format,
      );
      if (convertResponse.error !== 0) {
        return {
          success: false,
          error: "CONVERT_FAILED",
          message: `Gagal memulai konversi. Error code: ${convertResponse.error}`,
          raw: { init: initResponse, convert: convertResponse },
        };
      }

      const progressResponse = await this.checkProgress(
        convertResponse.progressURL,
      );

      return {
        success: true,
        videoId,
        title: convertResponse.title,
        format,
        hash: convertResponse.hash,
        downloadUrl: convertResponse.downloadURL,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        metadata: {
          country: initResponse.country,
          convertURL: initResponse.convertURL,
          progressURL: convertResponse.progressURL,
          redirectURL: convertResponse.redirectURL || null,
          finalProgress: progressResponse,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "EXCEPTION",
        message: error.message,
        stack: error.stack,
      };
    }
  }
}

function sanitizeFileName(name) {
  return (name || "audio").replace(/[\\/:*?"<>|]/g, "").slice(0, 100);
}

export default {
  name: "ytdl",
  category: "downloader",
  command: ["yta", "ytv"],
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
      return m.reply(
        `Contoh:\n${m.prefix}${m.command} https://youtube.com/watch?v=xxxxxxxxxxx`,
      );
    }

    const scraper = new Ytmp3Scraper();
    const format = m.command === "ytv" ? "mp4" : "mp3";

    const result = await scraper.scrape(url, format);

    if (!result.success) {
      return m.reply(`Gagal download: ${result.message || result.error}`);
    }

    const fileRes = await axios.get(result.downloadUrl, {
      responseType: "arraybuffer",
    });
    const buffer = Buffer.from(fileRes.data);
    const fileName = `${sanitizeFileName(result.title)}.${format}`;

    if (format === "mp3") {
      return conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: "audio/mp4",
          fileName,
          caption: `🎵 ${result.title}\n⏱️ Proses: ${result.duration}`,
        },
        { quoted: m },
      );
    }

    return conn.sendMessage(
      m.chat,
      {
        document: buffer,
        mimetype: "video/mp4",
        fileName,
        caption: `🎬 ${result.title}\n⏱️ Proses: ${result.duration}`,
      },
      { quoted: m },
    );
  },
};

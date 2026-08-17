import crypto from "crypto";

export default {
  name: "teraboxdl",
  category: "downloader",
  command: ["teradl", "teraboxdl"],
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
    const url = m.text?.trim();
    if (!url) {
      return m.reply(
        "Masukkan link Terabox.\nContoh: .teradl https://www.terabox.app/wap/share/filelist?surl=xxx",
      );
    }

    try {
      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const secretSalt = "T9do@SM1?xGn5";
      const timestamp = Math.floor(Date.now() / 1000);

      const token = crypto
        .createHash("md5")
        .update(secretSalt + timestamp + "/api/stream.php")
        .digest("hex");

      const res = await fetch(
        "https://playterabox.com/api/fetch-video?token=" +
          token +
          "&t=" +
          timestamp,
        {
          method: "POST",
          headers: {
            authority: "playterabox.com",
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            origin: "https://playterabox.com",
            referer: "https://playterabox.com/",
            "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          },
          body: JSON.stringify({ url }),
        },
      );

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const data = await res.json();

      if (data.status !== "success" || !data.list || data.list.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        return m.reply("Gagal mengambil data dari Terabox.");
      }

      const file = data.list[0];
      const downloadUrl = file.download_link || file.normal_dlink;

      if (!downloadUrl) {
        await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        return m.reply("Link download tidak ditemukan.");
      }

      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

      let caption = "📥 *Terabox Downloader*\n\n";
      caption += "📁 Nama: " + file.name + "\n";
      caption += "📦 Size: " + sizeMB + " MB\n";
      caption += "🎬 Durasi: " + (file.duration || "N/A") + "\n";
      caption += "📹 Kualitas: " + (file.quality || "N/A") + "\n";
      caption += "📂 Tipe: " + (file.type || "N/A") + "\n\n";
      caption += "⏳ Sedang mengunduh file...";

      await m.reply(caption);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Gagal download file: " + response.status);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      const ext = file.name.split(".").pop() || "mp4";
      const isVideo = ["mp4", "mkv", "avi", "mov", "webm", "flv"].includes(
        ext.toLowerCase(),
      );

      if (isVideo) {
        await conn.sendMessage(
          m.chat,
          {
            video: buffer,
            caption:
              "📥 *Terabox Downloader*\n\n📁 " +
              file.name +
              "\n📦 " +
              sizeMB +
              " MB\n🎬 " +
              (file.duration || "N/A"),
            fileName: file.name,
            mimetype: "video/" + ext,
          },
          { quoted: m },
        );
      } else {
        await conn.sendMessage(
          m.chat,
          {
            document: buffer,
            fileName: file.name,
            mimetype: "application/octet-stream",
            caption:
              "📥 *Terabox Downloader*\n\n📁 " +
              file.name +
              "\n📦 " +
              sizeMB +
              " MB",
          },
          { quoted: m },
        );
      }

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("[teraboxdl]", e);
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      return m.reply("Error: " + e.message);
    }
  },
};

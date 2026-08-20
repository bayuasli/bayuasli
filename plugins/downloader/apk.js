import { apkSearch, apkDownload } from "#scrape/apkpure.js";

const MAX_SIZE_MB = 90;

export default {
  name: "apk",
  category: "downloader",
  command: ["apksearch", "apkdown", "apk"],
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
    if (m.command === "apksearch" || m.command === "apk") {
      const query = m.text?.trim();
      if (!query) return m.reply("Usage: apksearch <nama aplikasi>");

      const results = await apkSearch(query);
      if (!results.length) return m.reply("Tidak ada hasil untuk: " + query);

      const teks = results
        .slice(0, 10)
        .map(
          (r, i) =>
            `${i + 1}. *${r.title}*\n` +
            `   Pkg : ${r.pkg}\n` +
            `   APK : ${r.apkUrl}`,
        )
        .join("\n\n");

      return m.reply(
        `Hasil APKPure: *${query}*\n\n${teks}\n\nDownload: apkdown <pkg/link>`,
      );
    }

    if (m.command === "apkdown") {
      const target = m.text?.trim();
      if (!target)
        return m.reply(
          "Usage:\n" +
            "apkdown com.whatsapp\n" +
            "apkdown whatsapp\n" +
            "apkdown https://apkpure.com/...",
        );

      await m.reply("Mengambil file, harap tunggu...");

      const result = await apkDownload(target);

      if (parseFloat(result.sizeMB) > MAX_SIZE_MB) {
        return m.reply(
          `File terlalu besar untuk dikirim via WhatsApp.\n\n` +
            `Nama  : ${result.title}\n` +
            `Size  : ${result.sizeMB} MB\n` +
            `Link  : https://d.apkpure.com/b/${result.type}/${result.pkg}?version=latest`,
        );
      }

      await conn.sendMessage(
        m.chat,
        {
          document: result.buffer,
          mimetype: result.mime,
          fileName: result.filename,
          caption:
            `*${result.title}*\n\n` +
            `Package : ${result.pkg}\n` +
            `Type    : ${result.type}\n` +
            `Size    : ${result.sizeMB} MB`,
        },
        { quoted: m },
      );
    }
  },
};

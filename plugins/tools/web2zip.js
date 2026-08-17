import axios from "axios";

export default {
  name: "web2zip",
  category: "tools",
  command: ["web2zip", "saveweb", "downloadweb"],
  alias: ["webtozip", "webzip"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, context) => {
    const { quoted } = context;
    let url = m.text || quoted?.text || "";

    url = url.trim();

    if (!url) {
      return m.reply(
        `📦 *SAVE WEB TO ZIP*\n\n` +
          `Cara Pakai:\n` +
          `.web2zip https://contoh.com\n\n` +
          `Contoh:\n` +
          `.web2zip https://mind.hydrooo.web.id/\n` +
          `.web2zip https://google.com`,
      );
    }

    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    const statusMsg = await m.reply("⏳ Memproses website...");

    try {
      const result = await saveweb2zip(url, {
        renameAssets: true,
        saveStructure: false,
        alternativeAlgorithm: false,
        mobileVersion: false,
      });

      if (result.error?.text) {
        throw new Error(result.error.text);
      }

      const caption =
        `📦 *WEB TO ZIP*\n\n` +
        `🌐 URL: ${result.url}\n` +
        `📁 File: ${result.copiedFilesAmount || 0} file\n` +
        `📥 Download: ${result.downloadUrl}\n\n` +
        `⬇️ Klik link di atas untuk download`;

      await conn.sendMessage(m.chat, { text: caption, edit: statusMsg.key });
    } catch (err) {
      await conn.sendMessage(m.chat, {
        text: `❌ Gagal: ${err.message}`,
        edit: statusMsg.key,
      });
    }
  },
};

async function saveweb2zip(url, options = {}) {
  try {
    if (!url) throw new Error("Url is required");
    url = url.startsWith("https://") ? url : `https://${url}`;
    const {
      renameAssets = false,
      saveStructure = false,
      alternativeAlgorithm = false,
      mobileVersion = false,
    } = options;

    const { data } = await axios.post(
      "https://copier.saveweb2zip.com/api/copySite",
      {
        url,
        renameAssets,
        saveStructure,
        alternativeAlgorithm,
        mobileVersion,
      },
      {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://saveweb2zip.com",
          referer: "https://saveweb2zip.com/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        },
      },
    );

    while (true) {
      const { data: process } = await axios.get(
        `https://copier.saveweb2zip.com/api/getStatus/${data.md5}`,
        {
          headers: {
            accept: "*/*",
            "content-type": "application/json",
            origin: "https://saveweb2zip.com",
            referer: "https://saveweb2zip.com/",
            "user-agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          },
        },
      );

      if (!process.isFinished) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      } else {
        return {
          url,
          error: {
            text: process.errorText,
            code: process.errorCode,
          },
          copiedFilesAmount: process.copiedFilesAmount,
          downloadUrl: `https://copier.saveweb2zip.com/api/downloadArchive/${process.md5}`,
        };
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

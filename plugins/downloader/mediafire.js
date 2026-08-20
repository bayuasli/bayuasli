import * as cheerio from "cheerio";

const mediaRegex = /https?:\/\/(www\.)?mediafire\.com\/(file|folder)\/(\w+)/;

export default {
  name: "mediafire",
  category: "downloader",
  command: ["mediafire", "mf"],

  run: async (conn, m) => {
    try {
      const args = m.body.split(" ").slice(1);
      const url = args[0];

      if (!url)
        return m.reply(
          "Contoh:\n.mediafire https://www.mediafire.com/file/xxxxx/file",
        );

      if (!mediaRegex.test(url))
        return m.reply("Link tidak valid! Pastikan link Mediafire benar.");

      const res = await mediafire(url);

      const caption = `
*💌 Nama:* ${res.filename}
*📊 Size:* ${res.sizeReadable}
*🗂️ FileType:* ${res.filetype}
*📦 MimeType:* ${res.mimetype}
*🔐 Privasi:* ${res.privacy}
*👤 Owner:* ${res.owner_name}`.trim();

      await m.reply(caption);

      await conn.sendMessage(
        m.chat,
        {
          document: { url: res.download },
          fileName: res.filename,
          mimetype: res.mimetype,
        },
        { quoted: m },
      );
    } catch (e) {
      console.error("MEDIAFIRE ERROR:", e);
      m.reply("Gagal mengambil file dari Mediafire.");
    }
  },
};

async function mediafire(url) {
  const match = mediaRegex.exec(url);
  if (!match) throw "URL tidak valid!";

  const id = match[3];

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const download = $("a#downloadButton").attr("href");
  if (!download) throw "Gagal mengambil link unduhan dari halaman Mediafire.";

  const infoResponse = await fetch(
    `https://www.mediafire.com/api/1.5/file/get_info.php?response_format=json&quick_key=${id}`,
  );
  const json = await infoResponse.json();

  if (json.response.result !== "Success") throw "Gagal mengambil info file.";

  const info = json.response.file_info;
  const size = parseInt(info.size);
  const ext = info.filename.split(".").pop();

  return {
    filename: info.filename,
    ext,
    size,
    sizeReadable: formatBytes(size),
    download,
    filetype: info.filetype,
    mimetype: info.mimetype || `application/${ext}`,
    privacy: info.privacy,
    owner_name: info.owner_name,
  };
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default {
  name: "readfile",
  category: "tools",
  command: ["cat", "rfile", "toteks"],

  settings: {
    group: false,
    owner: false,
    botAdmin: false,
  },

  run: async (conn, m, { quoted }) => {
    if (!quoted) return m.reply("Balas file teks yang ingin dibaca.");

    const mime = (quoted.msg || quoted).mimetype || "";

    if (mime.includes("zip")) return m.reply("File .zip tidak didukung.");

    const allowed =
      mime.startsWith("text/") ||
      mime.includes("javascript") ||
      mime.includes("html") ||
      mime.includes("css") ||
      mime.includes("json") ||
      mime.includes("xml") ||
      mime.includes("csv") ||
      mime.includes("markdown") ||
      mime.includes("plain");

    if (!allowed)
      return m.reply(
        "Hanya mendukung file teks (.txt, .js, .html, .css, .json, .xml, .csv, .md).",
      );

    try {
      const media = await quoted.download();
      const text = media.toString("utf-8");

      if (text.length > 65000)
        return m.reply("File terlalu panjang untuk ditampilkan.");

      await m.reply(text);
    } catch (err) {
      console.error(err);
      m.reply("Terjadi kesalahan saat membaca file.");
    }
  },
};

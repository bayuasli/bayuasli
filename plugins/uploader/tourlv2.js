import FormData from "form-data";
import axios from "axios";

export default {
  name: "tourlv2",
  category: "uploader",
  command: ["tourlv2"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM }) => {
    try {
      const q = m.isQuoted ? m.quoted : m;
      const mime = (q.msg || q).mimetype || "";

      if (!mime) return m.reply("Reply atau kirim media dengan caption .tourl");
      if (/webp/.test(mime)) return m.reply("File .webp tidak didukung.");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const buffer = await downloadM();
      if (!buffer) return m.reply("Gagal mengambil media.");

      const sizeKB = (buffer.length / 1024).toFixed(2);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      const fileSize =
        parseFloat(sizeMB) >= 1 ? `${sizeMB} MB` : `${sizeKB} KB`;

      let ext = mime.split("/")[1] || "bin";
      if (ext === "jpeg") ext = "jpg";

      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("time", "72h");
      form.append("fileToUpload", buffer, `file.${ext}`);

      const { data } = await axios.post(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        form,
        {
          headers: form.getHeaders(),
        },
      );

      const url = data.trim();
      if (!url.startsWith("https")) throw new Error("Upload gagal: " + url);

      await conn.sendMessage(
        m.chat,
        {
          text: `*File Berhasil Di Upload*\n\nURL     : ${url}\nUkuran  : ${fileSize}\nExpired : 72 jam`,
        },
        { quoted: m },
      );

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

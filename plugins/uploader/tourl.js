import axios from "axios";
import FormData from "form-data";

async function uploadToCdn(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, { filename });

  const res = await axios.post("https://cdn.zass.in/upload", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000,
  });

  if (!res.data?.success || !res.data?.url) {
    throw new Error("Upload gagal: " + JSON.stringify(res.data));
  }

  return res.data;
}

export default {
  name: "tourl",
  category: "uploader",
  command: ["tourl", "upload"],
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
    if (!m.quoted?.isMedia) {
      return m.reply(
        "Reply media (gambar/video/audio/dokumen) yang mau di-upload.",
      );
    }

    try {
      const buffer = await m.quoted.download();
      const mimetype = m.quoted.msg?.mimetype || "application/octet-stream";
      const ext = mimetype.split("/")[1]?.split(";")[0] || "bin";
      const filename = `${Date.now()}.${ext}`;

      const result = await uploadToCdn(buffer, filename);

      const text =
        `✅ Upload berhasil\n\n` +
        `URL: ${result.url}\n` +
        `Nama File: ${result.fileName}\n` +
        `File ID: ${result.fileId}\n` +
        `Ukuran: ${(result.size / 1024).toFixed(1)} KB`;

      return conn.sendMessage(
        m.chat,
        { text, linkPreview: null },
        { quoted: m },
      );
    } catch (err) {
      console.error("[tourl]", err);
      return m.reply("Gagal upload: " + err.message);
    }
  },
};

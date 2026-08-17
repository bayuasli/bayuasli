import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

export default {
  name: "qrgen",
  category: "tools",
  command: ["cqr", "qrgen"],

  run: async (conn, m, { quoted }) => {
    let textInput = m.text;
    let logoPath = null;

    if (!textInput && !quoted)
      return m.reply("Masukkan teks / reply gambar logo");

    if (quoted && /image/.test((quoted.msg || quoted).mimetype || "")) {
      const buffer = await conn.downloadMediaMessage(quoted);
      logoPath = `./qrlogo_${Date.now()}.png`;
      fs.writeFileSync(logoPath, buffer);
    }

    m.reply("⏳ Membuat QR Code...");

    try {
      const form = new FormData();
      if (logoPath)
        form.append("file", fs.createReadStream(path.resolve(logoPath)));

      let uploadedLogo = null;
      if (logoPath) {
        const upload = await axios.post(
          "https://api.qrcode-monkey.com/qr/uploadimage",
          form,
          { headers: { ...form.getHeaders() } },
        );
        uploadedLogo = upload.data.file;
      }

      const payload = {
        data: textInput || "SibayuXd",
        config: {
          body: "circle",
          eye: "frame13",
          eyeBall: "ball18",
          ...(uploadedLogo && { logo: uploadedLogo }),
        },
        size: 1025,
        download: "imageUrl",
        file: "png",
      };

      const res = await axios.post(
        "https://api.qrcode-monkey.com/qr/custom",
        payload,
        { headers: { "content-type": "text/plain;charset=UTF-8" } },
      );

      const imageUrl = "https:" + res.data.imageUrl;
      const img = await axios.get(imageUrl, { responseType: "arraybuffer" });

      await conn.sendMessage(
        m.chat,
        { image: img.data, caption: "✅ QR Code berhasil dibuat" },
        { quoted: m },
      );

      if (logoPath) fs.unlinkSync(logoPath);
    } catch {
      m.reply("❌ Gagal membuat QR");
    }
  },
};

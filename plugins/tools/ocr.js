import axios from "axios";
import FormData from "form-data";
import { Button, ButtonV2 } from "#helper";

export default {
  name: "ocr",
  category: "tools",
  command: ["ocr", "baca"],
  alias: [],

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
      if (
        !m.isQuoted ||
        !/image/.test((m.quoted.msg || m.quoted).mimetype || "")
      )
        return m.reply("Reply gambar yang mengandung teks.");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const buffer = await downloadM();
      if (!buffer) return m.reply("Gagal download gambar.");

      const form = new FormData();
      form.append("apikey", "K83999038988957");
      form.append("language", "eng");
      form.append("isOverlayRequired", "false");
      form.append("file", buffer, {
        filename: "image.jpg",
        contentType: "image/jpeg",
      });

      const { data } = await axios({
        method: "POST",
        url: "https://api.ocr.space/parse/image",
        data: form,
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (!data || data.IsErroredOnProcessing)
        return m.reply("Gagal membaca teks dari gambar.");

      const result = data.ParsedResults?.[0]?.ParsedText?.trim();
      if (!result) return m.reply("Tidak ada teks yang terdeteksi.");

      const lines = result
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => l.trim());
      const totalLines = lines.length;

      const textResult = lines.join("\n");

      await new Button(conn)
        .setTitle("OCR SUKSES")
        .setSubtitle(`Total ${totalLines} baris teks`)
        .setBody(
          textResult.length > 500
            ? textResult.slice(0, 500) + "..."
            : textResult,
        )
        .setFooter("Klik tombol untuk salin teks")
        .addCopy("📋 Salin Teks", textResult, { icon: "DOCUMENT" })
        .addReply("❌ Tutup", ".", { icon: "CANCEL" })
        .send(m.chat, { quoted: m });

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

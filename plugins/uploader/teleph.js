import fetch from "node-fetch";
import FormData from "form-data";

export default {
  name: "teleph",
  category: "uploader",
  command: ["teleph", "tgr"],

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
      if (!m.isQuoted || !m.quoted.isMedia)
        return m.reply("Reply media berupa gambar/video.");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const buffer = await downloadM();
      if (!buffer) throw new Error("Gagal download media.");

      const mime =
        m.quoted?.msg?.mimetype || m.quoted?.mimetype || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const sizeKB = (buffer.length / 1024).toFixed(2);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      const fileSize =
        parseFloat(sizeMB) >= 1 ? `${sizeMB} MB` : `${sizeKB} KB`;

      const form = new FormData();
      form.append("images", buffer, `file.${ext}`);

      const res = await fetch("https://telegraph.zorner.men/upload", {
        method: "POST",
        headers: form.getHeaders(),
        body: form,
      });

      if (!res.ok) throw new Error("Upload gagal: " + res.status);

      const result = await res.json();
      const url = result.links?.[0];
      if (!url) throw new Error("URL tidak ditemukan di response.");

      await conn.sendButton(
        m.chat,
        {
          title: "✅ Upload Berhasil",
          body: `URL     : ${url}\nUkuran  : ${fileSize}\nFormat  : ${ext.toUpperCase()}`,
          footer: global.nameown || "SbyuXd",
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy URL",
                copy_code: url,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Buka URL",
                url,
              }),
            },
          ],
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

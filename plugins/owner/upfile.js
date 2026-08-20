import fs from "fs";
import path from "path";

function cleanCode(input = "") {
  let code = String(input).trim();
  if (code.startsWith("```") && code.endsWith("```")) {
    code = code.slice(3, -3).trim();
  }
  if (code.startsWith("`") && code.endsWith("`")) {
    code = code.slice(1, -1).trim();
  }
  const lines = code.split("\n");
  if (lines.length > 0 && lines[0].startsWith("```")) {
    lines.shift();
  }
  if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
    lines.pop();
  }
  return lines.join("\n").trim();
}

export default {
  name: "upfile",
  category: "owner",
  command: ["upf", "upfile"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m, { downloadM, quoted }) => {
    const targetPath = m.text?.trim();

    if (!targetPath) {
      return m.reply(
        "*UPLOAD FILE*\n\n" +
          "Cara Penggunaan:\n" +
          "• Reply file dokumen atau teks kode\n" +
          "• Ketik `.upf path/tujuan/file.ext`\n\n" +
          "Contoh:\n" +
          "• `.upf lib/system/serialize.js`"
      );
    }

    if (!m.isQuoted) {
      return m.reply("Reply ke pesan teks atau file dokumen yang mau disimpan.");
    }

    const root = process.cwd();
    const cleanPath = targetPath.startsWith("./") ? targetPath.slice(2) : targetPath;
    const fullPath = path.resolve(root, cleanPath);

    if (!fullPath.startsWith(root)) {
      return m.reply("Path tidak valid, lokasi file harus berada di dalam folder project.");
    }

    let fileBuffer = null;
    const qMsg = quoted || m.quoted || m.q;

    if (qMsg.isMedia) {
      try {
        fileBuffer = await downloadM();
      } catch {
        try {
          fileBuffer = await qMsg.download();
        } catch (err) {
          return m.reply("Gagal mengunduh file media: " + err.message);
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      let code = qMsg.body || qMsg.text || "";

      if (qMsg.msg && qMsg.msg.message) {
        const msgObj = qMsg.msg.message;
        const contentType = Object.keys(msgObj)[0];

        if (contentType === "conversation") {
          code = msgObj.conversation || "";
        } else if (contentType === "extendedTextMessage") {
          code = msgObj.extendedTextMessage.text || "";
        } else if (contentType === "imageMessage") {
          code = msgObj.imageMessage.caption || "";
        } else if (contentType === "documentMessage") {
          code = msgObj.documentMessage.caption || "";
        } else if (contentType === "videoMessage") {
          code = msgObj.videoMessage.caption || "";
        } else if (contentType === "audioMessage") {
          code = msgObj.audioMessage.caption || "";
        }
      }

      code = cleanCode(code);

      if (!code) {
        return m.reply("Tidak ada teks, kode, atau file yang ditemukan dalam pesan balasan.");
      }

      fileBuffer = Buffer.from(code, "utf-8");
    }

    const dir = path.dirname(fullPath);
    const fileName = path.basename(fullPath);
    const exists = fs.existsSync(fullPath);

    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, fileBuffer);

      const sizeKb = (fileBuffer.length / 1024).toFixed(1);

      if (exists) {
        return m.reply(
          `*FILE OVERWRITTEN*\n\n` +
            `• *File* : \`${fileName}\`\n` +
            `• *Path* : \`./${cleanPath}\`\n` +
            `• *Ukuran* : \`${sizeKb} KB\`\n\n` +
            `File lama berhasil ditimpa.`
        );
      } else {
        return m.reply(
          `*FILE SAVED SUCCESS*\n\n` +
            `• *File* : \`${fileName}\`\n` +
            `• *Path* : \`./${cleanPath}\`\n` +
            `• *Ukuran* : \`${sizeKb} KB\``
        );
      }
    } catch (err) {
      return m.reply("Gagal menyimpan file: " + err.message);
    }
  },
};
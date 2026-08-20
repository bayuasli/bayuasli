import fs from "fs";
import path from "path";

export default {
  name: "tofile",
  category: "tools",
  command: ["tofile", "tf"],
  alias: ["txt2file", "code2file", "todoc"],

  settings: {
    owner: false,
    loading: false,
  },

  run: async (conn, m, { downloadM }) => {
    if (!m.isQuoted) {
      return m.reply("Reply teks/kode yang ingin dijadikan file");
    }

    if (!m.text || m.text.trim() === "") {
      return m.reply(
        "Contoh: .tofile index.js\n\nAtau .tofile script.py\n\nNama file harus memiliki ekstensi",
      );
    }

    const filename = m.text.trim();
    if (!filename.includes(".")) {
      return m.reply(
        "Nama file harus memiliki ekstensi\nContoh: test.js, script.py, index.html",
      );
    }

    let code = "";

    try {
      if (m.quoted.msg && m.quoted.msg.message) {
        const msgObj = m.quoted.msg.message;
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
        } else {
          code = m.quoted.body || m.quoted.text || "";
        }
      } else {
        code = m.quoted.body || m.quoted.text || "";
      }

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
      code = lines.join("\n").trim();
    } catch (err) {
      console.error("Extract code error:", err);
      code = m.quoted.body || m.quoted.text || "";
    }

    if (!code || code.trim() === "") {
      return m.reply(
        "Tidak ada teks/kode yang ditemukan dalam pesan yang di-reply",
      );
    }

    const tmpDir = path.join(process.cwd(), "tmp");
    const filePath = path.join(tmpDir, filename);

    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      fs.writeFileSync(filePath, code, "utf-8");

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      const ext = path.extname(filename).toLowerCase();
      let mimetype = "text/plain";

      const mimeMap = {
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".cjs": "application/javascript",
        ".ts": "application/typescript",
        ".tsx": "application/typescript",
        ".jsx": "application/javascript",
        ".py": "text/x-python",
        ".java": "text/x-java",
        ".cpp": "text/x-cpp",
        ".c": "text/x-c",
        ".h": "text/x-c",
        ".hpp": "text/x-cpp",
        ".html": "text/html",
        ".htm": "text/html",
        ".css": "text/css",
        ".scss": "text/x-scss",
        ".sass": "text/x-sass",
        ".less": "text/x-less",
        ".json": "application/json",
        ".xml": "application/xml",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".sh": "application/x-shellscript",
        ".bash": "application/x-shellscript",
        ".zsh": "application/x-shellscript",
        ".bat": "application/x-bat",
        ".cmd": "application/x-bat",
        ".ps1": "application/x-powershell",
        ".php": "application/x-php",
        ".rb": "application/x-ruby",
        ".go": "text/x-go",
        ".rs": "text/x-rust",
        ".swift": "text/x-swift",
        ".kt": "text/x-kotlin",
        ".kts": "text/x-kotlin",
        ".sql": "application/sql",
        ".yml": "application/x-yaml",
        ".yaml": "application/x-yaml",
        ".ini": "text/x-properties",
        ".cfg": "text/x-properties",
        ".conf": "text/x-properties",
        ".log": "text/plain",
        ".csv": "text/csv",
        ".svg": "image/svg+xml",
        ".vue": "text/html",
        ".svelte": "text/html",
        ".dockerfile": "text/plain",
        ".gitignore": "text/plain",
        ".env": "text/plain",
        ".editorconfig": "text/plain",
        ".prettierrc": "application/json",
        ".eslintrc": "application/json",
      };

      mimetype = mimeMap[ext] || "text/plain";

      let fileSizeText = "";
      if (fileSize < 1024) {
        fileSizeText = `${fileSize} bytes`;
      } else if (fileSize < 1024 * 1024) {
        fileSizeText = `${(fileSize / 1024).toFixed(2)} KB`;
      } else {
        fileSizeText = `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
      }

      const linesCount = code.split("\n").length;
      const charsCount = code.length;

      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(filePath),
          fileName: filename,
          mimetype: mimetype,
          caption: `📄 *${filename}*\n\n📊 *Info:*\n• Baris: ${linesCount}\n• Karakter: ${charsCount}\n• Ukuran: ${fileSizeText}\n• Ekstensi: ${ext || "none"}\n• MIME: ${mimetype}`,
        },
        { quoted: m },
      );

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("File creation error:", err);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }

      let errorMsg = "Gagal membuat file: ";
      if (err.code === "ENOENT") {
        errorMsg += "Direktori tidak ditemukan";
      } else if (err.code === "EACCES") {
        errorMsg += "Izin ditolak";
      } else if (err.code === "ENOSPC") {
        errorMsg += "Ruang disk penuh";
      } else {
        errorMsg += err.message;
      }

      m.reply(errorMsg);
    }
  },
};

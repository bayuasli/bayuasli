import fs from "fs";
import path from "path";

export default {
  name: "getplugin",
  category: "owner",
  command: ["gp", "getplugin"],
  alias: ["gplugin"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true,
  },

  run: async (conn, m) => {
    let rawText = m.text?.trim() || "";
    if (!rawText) {
      return m.reply("Contoh: .gp tools/ping atau .gp ping -f");
    }

    let sendAsFile = false;
    if (/-f\b/i.test(rawText)) {
      sendAsFile = true;
      rawText = rawText.replace(/-f\b/gi, "").trim();
    } else if (/-t\b/i.test(rawText)) {
      sendAsFile = false;
      rawText = rawText.replace(/-t\b/gi, "").trim();
    }

    let input = rawText.replace(/\.js$/i, "").trim();
    const baseDir = path.join(process.cwd(), "plugins");
    let filePath = null;

    if (input.includes("/")) {
      const possible = path.join(baseDir, input + ".js");
      if (fs.existsSync(possible)) {
        filePath = possible;
      }
    } else {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const possible = path.join(baseDir, entry.name, input + ".js");
          if (fs.existsSync(possible)) {
            filePath = possible;
            break;
          }
        } else if (entry.isFile() && entry.name.toLowerCase() === (input + ".js").toLowerCase()) {
          filePath = path.join(baseDir, entry.name);
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return m.reply(`Plugin ${input} tidak ditemukan.`);
    }

    const code = fs.readFileSync(filePath, "utf-8");

    if (sendAsFile) {
      try {
        const fileBuffer = Buffer.from(code, "utf-8");
        const actualFileName = path.basename(filePath);

        return await conn.sendMessage(
          m.chat,
          {
            document: fileBuffer,
            mimetype: "application/javascript",
            fileName: actualFileName,
          },
          { quoted: m }
        );
      } catch (err) {
        return m.reply("Gagal mengirim file plugin: " + err.message);
      }
    }

    return m.reply(code);
  },
};
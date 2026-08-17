import fs from "fs";
import path from "path";
import { AIRich } from "#helper";

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
  },

  run: async (conn, m) => {
    let rawText = m.text?.trim() || "";
    if (!rawText) {
      return m.reply(
        "*GET PLUGIN*\n\n" +
          "Opsi Penggunaan:\n" +
          "• `.gp tools/ping` (Kirim sebagai teks AIRich)\n" +
          "• `.gp tools/ping -t` (Kirim sebagai teks AIRich)\n" +
          "• `.gp tools/ping -f` (Kirim sebagai file .js)"
      );
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
    let pluginName = input;

    if (input.includes("/")) {
      filePath = path.join(baseDir, input + ".js");
      pluginName = input;
    } else {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const possible = path.join(baseDir, entry.name, input + ".js");
          if (fs.existsSync(possible)) {
            filePath = possible;
            pluginName = entry.name + "/" + input;
            break;
          }
        } else if (entry.isFile() && entry.name.toLowerCase() === (input + ".js").toLowerCase()) {
          filePath = path.join(baseDir, entry.name);
          pluginName = input;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return m.reply("Plugin tidak ditemukan: " + input);
    }

    const code = fs.readFileSync(filePath, "utf8");
    const stats = fs.statSync(filePath);
    const linesCount = code.split("\n").length;
    const fileSize = stats.size;

    const sizeText =
      fileSize < 1024
        ? fileSize + " B"
        : fileSize < 1024 * 1024
          ? (fileSize / 1024).toFixed(1) + " KB"
          : (fileSize / (1024 * 1024)).toFixed(1) + " MB";

    const parts = pluginName.split("/");
    const folder = parts.length > 1 ? parts[0] : "plugins";
    const fileName = parts.length > 1 ? parts[1] : pluginName;

    if (sendAsFile) {
      try {
        const fileBuffer = Buffer.from(code, "utf-8");
        const actualFileName = path.basename(filePath);

        await conn.sendMessage(
          m.chat,
          {
            document: fileBuffer,
            mimetype: "application/javascript",
            fileName: actualFileName,
            caption:
              `*GET PLUGIN FILE*\n\n` +
              `• *Path* : \`plugins/${pluginName}.js\`\n` +
              `• *Baris* : \`${linesCount}\`\n` +
              `• *Ukuran* : \`${sizeText}\``
          },
          { quoted: m }
        );
      } catch (err) {
        m.reply("Gagal mengirim file plugin: " + err.message);
      }
      return;
    }

    try {
      await new AIRich(conn)
        .setTitle("sbyuxD")
        .setFooter("© sbyuxD")
        .addSuggest("GetPlugin")
        .addSuggest(["plugins", folder, fileName])
        .addTip("📄 " + pluginName + ".js | " + linesCount + " lines | " + sizeText)
        .addProduct({
          title: pluginName + ".js",
          brand: "sbyuxD Bot",
          price: "Rp 0",
          sale_price: "Rp 0",
          url: "https://wa.me/6288228819127",
          image: "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
        })
        .addCode("javascript", code)
        .send(m.chat, { quoted: m });
    } catch (err) {
      console.error("[getplugin]", err);
      m.reply("Gagal mengirim plugin: " + err.message);
    }
  },
};
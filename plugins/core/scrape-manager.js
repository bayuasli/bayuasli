import fs from "fs";
import path from "path";
import { AIRich } from "#helper";

const scrapeDir = path.join(process.cwd(), "lib/scrape");

function ensureDir() {
  if (!fs.existsSync(scrapeDir)) fs.mkdirSync(scrapeDir, { recursive: true });
}

function sanitizeFilename(name) {
  if (!name) return null;
  let base = path.basename(name);
  if (!base || base.includes("..")) return null;
  if (!base.endsWith(".js")) base = base + ".js";
  return base;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function getScrapeFiles() {
  return fs.readdirSync(scrapeDir).filter((f) => f.endsWith(".js"));
}

export default {
  name: "scrape-manager",
  category: "core",
  command: ["scr", "listscrape", "getscrape", "dscr", "delscrape"],
  alias: [],
  settings: {
    owner: true,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    ensureDir();

    const cmd = m.command;
    const prefix = m.prefix;
    const args = m.args || [];
    const text = m.text || "";

    if (cmd === "listscrape" || cmd === "lscr") {
      const files = getScrapeFiles();
      if (files.length === 0) return m.reply("Belum ada file di lib/scrape.");

      let textMsg = "SCRAPE FILES\n\n";
      for (const file of files) {
        const stat = fs.statSync(path.join(scrapeDir, file));
        const name = file.replace(".js", "");
        textMsg += "• " + name + "\n";
        textMsg += "  Size: " + formatBytes(stat.size) + "\n";
        textMsg +=
          "  Updated: " + new Date(stat.mtime).toLocaleString("id-ID") + "\n\n";
      }
      textMsg += "Total: " + files.length + " files";
      return m.reply(textMsg);
    }

    if (cmd === "dscr" || cmd === "delscrape" || cmd === "del") {
      const name = args[0] || text.trim();
      if (!name) return m.reply("Contoh: " + prefix + "dscr namafile");

      const filename = sanitizeFilename(name);
      if (!filename) return m.reply("Nama file tidak valid.");

      const filePath = path.join(scrapeDir, filename);
      if (!fs.existsSync(filePath))
        return m.reply("File " + filename + " tidak ditemukan.");

      fs.unlinkSync(filePath);
      return m.reply("File " + filename + " berhasil dihapus.");
    }

    if (cmd === "getscrape" || cmd === "get") {
      const name = args[0] || text.trim();
      if (!name) return m.reply("Contoh: " + prefix + "getscrape namafile");

      const filename = sanitizeFilename(name);
      if (!filename) return m.reply("Nama file tidak valid.");

      const filePath = path.join(scrapeDir, filename);
      if (!fs.existsSync(filePath))
        return m.reply("File " + filename + " tidak ditemukan.");

      const code = fs.readFileSync(filePath, "utf-8");
      const stat = fs.statSync(filePath);

      return new AIRich(conn)
        .setTitle("📄 " + filename)
        .setFooter(formatBytes(stat.size) + " · lib/scrape/" + filename)
        .addCode("javascript", code)
        .send(m.chat, { quoted: m });
    }

    if (cmd === "scr") {
      const rawBody = m.body || "";
      const breakIndex = rawBody.indexOf("\n");
      const firstLine =
        breakIndex === -1 ? rawBody : rawBody.slice(0, breakIndex);
      const restBody = breakIndex === -1 ? "" : rawBody.slice(breakIndex + 1);

      const firstLineParts = firstLine.trim().split(/\s+/);
      const name = firstLineParts[1];
      if (!name) {
        return m.reply(
          "Format:\n" +
            prefix +
            "scr namafile\n<kode di sini>\n\n" +
            "Atau reply dokumen .js dengan caption:\n" +
            prefix +
            "scr namafile",
        );
      }

      const filename = sanitizeFilename(name);
      if (!filename) return m.reply("Nama file tidak valid.");

      let code = restBody.trim();

      if (!code && m.quoted?.isMedia) {
        const mimetype = m.quoted.msg?.mimetype || "";
        if (!/text|javascript|json/i.test(mimetype)) {
          return m.reply("Dokumen harus berupa file teks/.js.");
        }
        const buffer = await m.quoted.download();
        code = buffer.toString("utf-8");
      } else if (!code && m.quoted?.body) {
        code = m.quoted.body;
      }

      if (!code) {
        return m.reply("Kode tidak boleh kosong.");
      }

      const filePath = path.join(scrapeDir, filename);
      const isUpdate = fs.existsSync(filePath);

      fs.writeFileSync(filePath, code, "utf-8");

      return m.reply(
        (isUpdate ? "Diperbarui" : "Disimpan") +
          ": " +
          filename +
          "\n" +
          "Size: " +
          formatBytes(Buffer.byteLength(code)) +
          "\n" +
          "Lines: " +
          code.split("\n").length +
          "\n" +
          "Path: lib/scrape/" +
          filename +
          "\n" +
          "Import: #scrape/" +
          filename.replace(".js", ""),
      );
    }

    return m.reply(
      "SCRAPE MANAGER\n\n" +
        prefix +
        "scr namafile - create/update\n" +
        prefix +
        "listscrape / lscr - list files\n" +
        prefix +
        "getscrape / get namafile - view file\n" +
        prefix +
        "dscr / delscrape / del namafile - delete file",
    );
  },
};

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export default {
  name: "backup-folder",
  category: "owner",
  command: ["backfold", "bf"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    let folderName = m.text?.trim().replace(/^\.\//, "").replace(/\/$/, "");

    if (!folderName) {
      return m.reply("Ketik nama folder yang ingin di-backup.\n\nContoh: *.backfold plugins*");
    }

    const resolvedPath = path.resolve(process.cwd(), folderName);

    if (!resolvedPath.startsWith(process.cwd())) {
      return m.reply("Akses direktori di luar project dilarang.");
    }

    if (!fs.existsSync(resolvedPath)) {
      return m.reply(`Folder *${folderName}* tidak ditemukan.`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return m.reply(`*${folderName}* bukan sebuah folder.`);
    }

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const cleanName = folderName.replace(/[\/\\]/g, "_");
    const zipFileName = `${cleanName}-${Date.now()}.zip`;
    const zipFilePath = path.join(tmpDir, zipFileName);

    try {
      const zip = new AdmZip();
      zip.addLocalFolder(resolvedPath);
      zip.writeZip(zipFilePath);

      const fileBuffer = fs.readFileSync(zipFilePath);
      const fileSizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);

      await conn.sendMessage(
        m.chat,
        {
          document: fileBuffer,
          mimetype: "application/zip",
          fileName: zipFileName,
          caption:
            `*BACKUP FOLDER SUCCESS*\n\n` +
            `• *Folder* : \`${folderName}\`\n` +
            `• *Ukuran* : \`${fileSizeMb} MB\``,
        },
        { quoted: m }
      );
    } catch (err) {
      return m.reply("Gagal membuat file backup: " + err.message);
    } finally {
      if (fs.existsSync(zipFilePath)) {
        try {
          fs.unlinkSync(zipFilePath);
        } catch {}
      }
    }
  },
};
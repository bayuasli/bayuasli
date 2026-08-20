import axios from "axios";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream, createReadStream } from "fs";
import AdmZip from "adm-zip";

async function extractTgz(tgzPath, destDir) {
  const tarStream = await import("tar-stream");
  const extract = tarStream.extract();

  return new Promise((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const filePath = path.join(
        destDir,
        header.name.replace(/^package\//, ""),
      );

      if (header.type === "directory") {
        fs.mkdirSync(filePath, { recursive: true });
        stream.resume();
        return next();
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      stream.pipe(createWriteStream(filePath));
      stream.on("end", next);
      stream.on("error", reject);
    });

    extract.on("finish", resolve);
    extract.on("error", reject);

    createReadStream(tgzPath).pipe(zlib.createGunzip()).pipe(extract);
  });
}

export default {
  name: "npmdl",
  category: "downloader",
  command: ["npmdl"],
  settings: {
    owner: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (!m.text) return m.reply(`Contoh: ${m.cmd} @whiskeysockets/baileys`);

    const pkgName = m.text.trim();

    try {
      const info = await axios.get(
        `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
      );
      const version = info.data["dist-tags"].latest;
      const meta = await axios.get(
        `https://registry.npmjs.org/${encodeURIComponent(pkgName)}/${version}`,
      );
      const tarballUrl = meta.data.dist.tarball;

      if (!tarballUrl)
        return m.reply("Tarball tidak ditemukan untuk package ini.");

      await m.reply(`Mengunduh *${pkgName} v${version}*...`);

      const tmpDir = path.join(process.cwd(), "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });

      const safeName = pkgName.replace(/[\/@]/g, "_");
      const tarballPath = path.join(tmpDir, `${safeName}-${version}.tgz`);
      const extractPath = path.join(tmpDir, `${safeName}-${version}`);
      const zipPath = path.join(tmpDir, `${safeName}-${version}.zip`);

      const res = await axios.get(tarballUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(tarballPath, res.data);

      fs.mkdirSync(extractPath, { recursive: true });
      await extractTgz(tarballPath, extractPath);

      const zip = new AdmZip();
      zip.addLocalFolder(extractPath);
      zip.writeZip(zipPath);

      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(zipPath),
          mimetype: "application/zip",
          fileName: `${pkgName.replace("/", "_")}-${version}.zip`,
          caption: `Berhasil mengunduh *${pkgName}@${version}*`,
        },
        { quoted: m },
      );

      fs.unlinkSync(tarballPath);
      fs.rmSync(extractPath, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
    } catch (err) {
      return m.reply(
        "Gagal mengunduh package.\nPastikan nama package benar.\n\n" +
          err.message,
      );
    }
  },
};

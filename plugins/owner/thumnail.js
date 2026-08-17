import fs from "fs";
import path from "path";
import { AIRich } from "#helper";
import { fileTypeFromBuffer } from "file-type";

const MEDIA_DIR = path.join(process.cwd(), "lib/media");

function getThumbnails() {
  try {
    const files = fs.readdirSync(MEDIA_DIR);
    return files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  } catch {
    return [];
  }
}

function getThumbnailPath(filename) {
  return path.join(MEDIA_DIR, filename);
}

function generateRandomName(ext) {
  const random = Math.floor(1000 + Math.random() * 9000);
  return "sbyuxd" + random + "." + ext;
}

export default {
  name: "thumnail",
  category: "owner",
  command: ["addtm", "deltm", "listtm", "looktm"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const command = m.command;

    if (command === "listtm") {
      const files = getThumbnails();
      if (files.length === 0) {
        return m.reply("Belum ada thumbnail.");
      }

      const tableData = [["No", "Nama File"]];

      files.forEach((file, i) => {
        tableData.push([String(i + 1), file]);
      });

      await new AIRich(conn)
        .setTitle("📁 Daftar Thumbnail")
        .setFooter("Total: " + files.length + " file")
        .addTable(tableData)
        .send(m.chat, { quoted: m });

      return;
    }

    if (command === "addtm") {
      const quoted = m.quoted || m;

      if (!quoted.isMedia) {
        return m.reply(
          "Reply gambar atau sticker yang mau dijadikan thumbnail.",
        );
      }

      const mimeType = quoted.msg?.mimetype || "";
      if (!/image|sticker/i.test(mimeType)) {
        return m.reply("Reply gambar atau sticker.");
      }

      try {
        const buffer = await conn.downloadMediaMessage(quoted);
        const type = await fileTypeFromBuffer(buffer);
        const ext = type?.ext || "jpg";
        const filename = generateRandomName(ext);
        const filepath = getThumbnailPath(filename);

        fs.writeFileSync(filepath, buffer);

        return m.reply("✅ Thumbnail berhasil ditambahkan:\n" + filename);
      } catch (e) {
        console.error("[addtm]", e);
        return m.reply("Gagal menambahkan thumbnail: " + e.message);
      }
    }

    if (command === "deltm") {
      const args = m.args;
      if (!args || args.length === 0) {
        return m.reply("Gunakan: .deltm 1,2,3 (dari list .listtm)");
      }

      const files = getThumbnails();
      if (files.length === 0) {
        return m.reply("Belum ada thumbnail.");
      }

      const indices = args
        .join(",")
        .split(",")
        .map((v) => parseInt(v.trim()) - 1)
        .filter((v) => !isNaN(v) && v >= 0);
      const toDelete = indices.map((i) => files[i]).filter((f) => f);

      if (toDelete.length === 0) {
        return m.reply("Tidak ada file yang bisa dihapus (index salah).");
      }

      let deleted = [];
      let failed = [];

      for (const file of toDelete) {
        try {
          const filepath = getThumbnailPath(file);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            deleted.push(file);
          } else {
            failed.push(file);
          }
        } catch {
          failed.push(file);
        }
      }

      let msg = "🗑️ Hapus Thumbnail\n\n";
      if (deleted.length > 0) {
        msg +=
          "✅ Berhasil dihapus:\n" +
          deleted.map((f) => "• " + f).join("\n") +
          "\n\n";
      }
      if (failed.length > 0) {
        msg += "❌ Gagal dihapus:\n" + failed.map((f) => "• " + f).join("\n");
      }

      return m.reply(msg);
    }

    if (command === "looktm") {
      const args = m.args;
      if (!args || args.length === 0) {
        return m.reply("Gunakan: .looktm 1,2,3 (dari list .listtm)");
      }

      const files = getThumbnails();
      if (files.length === 0) {
        return m.reply("Belum ada thumbnail.");
      }

      const indices = args
        .join(",")
        .split(",")
        .map((v) => parseInt(v.trim()) - 1)
        .filter((v) => !isNaN(v) && v >= 0);
      const toLook = indices.map((i) => files[i]).filter((f) => f);

      if (toLook.length === 0) {
        return m.reply("Tidak ada file yang bisa ditampilkan (index salah).");
      }

      try {
        const medias = [];

        for (const file of toLook) {
          const filepath = getThumbnailPath(file);
          if (fs.existsSync(filepath)) {
            const buffer = fs.readFileSync(filepath);
            const type = await fileTypeFromBuffer(buffer);
            const ext = type?.ext || "jpg";

            if (ext === "webp") {
              medias.push({ image: buffer });
            } else if (["jpg", "jpeg", "png"].includes(ext)) {
              medias.push({ image: buffer });
            }
          }
        }

        if (medias.length === 0) {
          return m.reply("Tidak ada file yang valid untuk ditampilkan.");
        }

        if (medias.length === 1) {
          await conn.sendMessage(
            m.chat,
            { image: medias[0].image },
            { quoted: m },
          );
        } else {
          await conn.sendAlbumMessage(m.chat, medias, { quoted: m });
        }
      } catch (e) {
        console.error("[looktm]", e);
        return m.reply("Gagal menampilkan thumbnail: " + e.message);
      }
    }
  },
};

import fs from "fs";
import path from "path";
import { Button } from "#helper";
import {
  uploadSingleFile,
  uploadFolder,
  deleteSingleFile,
  deleteFolder,
  listFiles,
  getTree
} from "#scrape/uprepo.js";

const REPO_OWNER = "sbyuxD";
const REPO_NAME = "WolfBot";
const BRANCH = "main";
const dbPath = path.join(process.cwd(), "lib/database/github.json");

function getStoredToken() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      if (data.token) return data.token;
    }
  } catch {}
  return global.githubToken || "";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function showMenu(conn, m) {
  return new Button(conn)
    .setTitle("GitHub Uploader")
    .setBody(`Repo: ${REPO_OWNER}/${REPO_NAME} (${BRANCH})\n\nPilih opsi aksi uploader:`)
    .setFooter(global.body || "sbyuxD !")
    .addSelection("Pilih Opsi")
    .makeSection("Aksi Repo")
    .makeRow("", "Upload File/Folder", "Ketik: .upsc <path>", ".upsc")
    .makeRow("", "Hapus File/Folder", "Ketik: .upsc delete <path>", ".upsc delete")
    .makeRow("", "List File Repo", "Ketik: .upsc list [path]", ".upsc list")
    .makeRow("", "Tree Hierarchy", "Ketik: .upsc tree", ".upsc tree")
    .send(m.chat, { quoted: m });
}

export default {
  name: "update-repo",
  category: "owner",
  command: ["upsc", "uprepo", "gitpush"],
  alias: ["repoupdate"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const token = getStoredToken();

    if (!token) {
      return m.reply("Token GitHub belum di-set. Gunakan `.git settoken <token>` terlebih dahulu.");
    }

    const args = m.args || [];
    if (!args.length) return showMenu(conn, m);

    const action = args[0].toLowerCase();

    if (action === "delete" || action === "del" || action === "rm") {
      const targetPath = args[1]?.replace(/^\.\//, "").trim();
      if (!targetPath) {
        return m.reply("Ketik path file/folder di GitHub yang ingin dihapus.\n\nContoh: `.upsc delete plugins/owner/test.js`");
      }

      await m.react("⏳");

      try {
        const fullLocal = path.resolve(process.cwd(), targetPath);
        const isLocalDir = fs.existsSync(fullLocal) && fs.statSync(fullLocal).isDirectory();

        if (isLocalDir) {
          const res = await deleteFolder(targetPath, token);
          await m.react("✅");
          return new Button(conn)
            .setBody(`*FOLDER DELETED FROM GITHUB*\n\n• *Path* : \`${targetPath}\`\n• *Jumlah File* : \`${res.deleted} file\``)
            .addUrl("Buka Repo", `https://github.com/${REPO_OWNER}/${REPO_NAME}`, false)
            .send(m.chat, { quoted: m });
        } else {
          await deleteSingleFile(targetPath, token);
          await m.react("✅");
          return new Button(conn)
            .setBody(`*FILE DELETED FROM GITHUB*\n\n• *Path* : \`${targetPath}\``)
            .addUrl("Buka Repo", `https://github.com/${REPO_OWNER}/${REPO_NAME}`, false)
            .send(m.chat, { quoted: m });
        }
      } catch (err) {
        return m.reply("Gagal menghapus dari GitHub: " + err.message);
      }
    }

    if (action === "list" || action === "ls") {
      const dirPath = (args[1] || "").replace(/^\.\//, "").trim();

      await m.react("⏳");

      try {
        const items = await listFiles(dirPath, token);
        await m.react("✅");

        if (!items.length) {
          return m.reply(`Folder \`${dirPath || "root"}\` di GitHub kosong.`);
        }

        const folders = items.filter((f) => f.type === "dir");
        const files = items.filter((f) => f.type === "file");

        let text = `*GITHUB REPO CONTENTS*\nPath : \`./${dirPath || "root"}\`\n\n`;

        if (folders.length) {
          text += `*Folders*:\n` + folders.map((f) => `📁 \`${f.name}/\``).join("\n") + "\n\n";
        }

        if (files.length) {
          text += `*Files*:\n` + files.map((f) => `📄 \`${f.name}\` (${formatBytes(f.size)})`).join("\n");
        }

        return m.reply(text);
      } catch (err) {
        return m.reply("Gagal mengambil daftar file: " + err.message);
      }
    }

    if (action === "tree") {
      await m.react("⏳");

      try {
        const treeItems = await getTree(token);
        await m.react("✅");

        if (!treeItems.length) return m.reply("Tree repo kosong.");

        const limitedTree = treeItems.slice(0, 50);
        const text = limitedTree.map((item) => {
          const depth = item.path.split("/").length - 1;
          const indent = "  ".repeat(depth);
          const icon = item.type === "tree" ? "📁" : "📄";
          return `${indent}${icon} \`${path.basename(item.path)}\``;
        }).join("\n");

        return m.reply(`*REPOSITORY TREE HIERARCHY*\n\n${text}\n\n_Total: ${treeItems.length} item_`);
      } catch (err) {
        return m.reply("Gagal mengambil tree: " + err.message);
      }
    }

    const inputPath = args[0].replace(/^\.\//, "").trim();
    const fullPath = path.resolve(process.cwd(), inputPath);

    if (!fs.existsSync(fullPath)) {
      return m.reply(`File atau folder \`${inputPath}\` tidak ditemukan di server.`);
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await m.reply(`Mengunggah seluruh folder \`${inputPath}\` ke GitHub...`);
      await m.react("⏳");

      try {
        const res = await uploadFolder(inputPath, token);
        await m.react("✅");

        return new Button(conn)
          .setBody(
            `*FOLDER UPLOAD SUCCESS*\n\n` +
              `• *Folder* : \`${inputPath}\`\n` +
              `• *Sukses* : \`${res.uploaded} file\`\n` +
              (res.failed ? `• *Gagal*  : \`${res.failed} file\`\n` : "") +
              `• *Repo*   : \`${REPO_OWNER}/${REPO_NAME}\``
          )
          .addUrl("Buka Repo", `https://github.com/${REPO_OWNER}/${REPO_NAME}`, false)
          .send(m.chat, { quoted: m });
      } catch (err) {
        return m.reply("Gagal mengupload folder: " + err.message);
      }
    }

    await m.react("⏳");

    try {
      const res = await uploadSingleFile(inputPath, token);
      await m.react("✅");

      const actionText = res.action === "created" ? "Membuat File Baru" : "Menimpa File";

      return new Button(conn)
        .setBody(
          `*${actionText.toUpperCase()}*\n\n` +
            `• *File*   : \`${inputPath}\`\n` +
            `• *Ukuran* : \`${formatBytes(res.size)}\`\n` +
            `• *Repo*   : \`${REPO_OWNER}/${REPO_NAME}\``
        )
        .addUrl("Buka File", res.url, false)
        .send(m.chat, { quoted: m });
    } catch (err) {
      return m.reply("Gagal mengupload file: " + err.message);
    }
  },
};
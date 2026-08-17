import fs from "fs";
import path from "path";
import axios from "axios";

const REPO_OWNER = "sbyuxD";
const REPO_NAME = "WolfBot";
const BRANCH = "main";

async function getFileSha(repoPath, token) {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
      {
        params: { ref: BRANCH },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    return data.sha;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function uploadFile(repoPath, token) {
  const fullPath = path.resolve(process.cwd(), repoPath);

  if (!fs.existsSync(fullPath)) {
    return { ok: false, reason: `File tidak ditemukan: ${repoPath}` };
  }

  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) {
    return { ok: false, reason: `Path adalah folder, bukan file: ${repoPath}` };
  }

  const content = fs.readFileSync(fullPath).toString("base64");
  const sha = await getFileSha(repoPath, token);

  const response = await axios.put(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
    {
      message: `update: ${repoPath}`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  return {
    ok: true,
    action: sha ? "updated" : "created",
    url: response.data.content.html_url,
    sha: response.data.content.sha,
  };
}

async function deleteFile(repoPath, token) {
  const sha = await getFileSha(repoPath, token);
  if (!sha) {
    return { ok: false, reason: `File tidak ditemukan di GitHub: ${repoPath}` };
  }

  await axios.delete(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
    {
      data: {
        message: `delete: ${repoPath}`,
        sha,
        branch: BRANCH,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  return { ok: true, action: "deleted" };
}

async function listFiles(dirPath = "", token) {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${dirPath}`,
      {
        params: { ref: BRANCH },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
      url: item.html_url,
    }));
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

const HELP = `*📤 GitHub Uploader*

Perintah:
• .upsc <path> - Upload file ke repo
• .upsc delete <path> - Hapus file dari repo
• .upsc list [path] - Lihat file di repo
• .upsc info <path> - Info file di repo

Contoh:
.upsc plugins/owner/test.js
.upsc delete plugins/owner/test.js
.upsc list plugins
.upsc info config.js

Repo: ${REPO_OWNER}/${REPO_NAME}
Branch: ${BRANCH}`;

export default {
  name: "update-repo",
  category: "owner",
  command: ["upsc", "github", "gh"],
  alias: ["gitpush", "repoupdate"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m) => {
    const token = global.githubToken;

    if (!token || token === "") {
      return m.reply(
        '❌ GitHub token belum diset.\n\nTambahkan di config.js:\nglobal.githubToken = "your_token_here"',
      );
    }

    const args = m.args;
    if (args.length === 0) {
      return m.reply(HELP);
    }

    const action = args[0].toLowerCase();

    if (action === "delete" || action === "del" || action === "rm") {
      const filePath = args[1];
      if (!filePath) {
        return m.reply(
          "Sertakan path file yang akan dihapus.\n\nContoh: .upsc delete plugins/test.js",
        );
      }

      const cleanPath = filePath.replace(/^\.\//, "");

      await m.reply(`🗑️ Menghapus *${cleanPath}* dari GitHub...`);

      try {
        const result = await deleteFile(cleanPath, token);
        if (!result.ok) {
          return m.reply(`❌ Gagal: ${result.reason}`);
        }

        return m.reply(
          `✅ *File berhasil dihapus*\n\n📄 ${cleanPath}\n📦 Repo: ${REPO_OWNER}/${REPO_NAME}`,
        );
      } catch (error) {
        console.error("Delete error:", error);
        return m.reply(
          `❌ Gagal menghapus file: ${error.response?.data?.message || error.message}`,
        );
      }
    }

    if (action === "list" || action === "ls") {
      const dirPath = args[1] || "";
      const cleanPath = dirPath.replace(/^\.\//, "");

      await m.reply(
        `📂 Mengambil daftar file dari *${cleanPath || "root"}*...`,
      );

      try {
        const files = await listFiles(cleanPath, token);

        if (files.length === 0) {
          return m.reply(
            `📁 *${cleanPath || "root"}*\n\nFolder kosong atau tidak ditemukan`,
          );
        }

        const folders = files.filter((f) => f.type === "dir");
        const fileItems = files.filter((f) => f.type === "file");

        let message = `📁 *${cleanPath || "root"}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        if (folders.length > 0) {
          message += `\n📂 *Folders:*\n`;
          folders.forEach((f) => {
            message += `📁 ${f.name}/\n`;
          });
        }

        if (fileItems.length > 0) {
          message += `\n📄 *Files:*\n`;
          fileItems.slice(0, 30).forEach((f) => {
            const size =
              f.size < 1024
                ? `${f.size} B`
                : f.size < 1024 * 1024
                  ? `${(f.size / 1024).toFixed(1)} KB`
                  : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
            message += `📄 ${f.name} (${size})\n`;
          });

          if (fileItems.length > 30) {
            message += `\n... dan ${fileItems.length - 30} file lainnya`;
          }
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 Total: ${folders.length} folder, ${fileItems.length} file`;

        return m.reply(message);
      } catch (error) {
        console.error("List error:", error);
        return m.reply(
          `❌ Gagal mengambil daftar: ${error.response?.data?.message || error.message}`,
        );
      }
    }

    if (action === "info") {
      const filePath = args[1];
      if (!filePath) {
        return m.reply("Sertakan path file.\n\nContoh: .upsc info config.js");
      }

      const cleanPath = filePath.replace(/^\.\//, "");

      try {
        const { data } = await axios.get(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanPath}`,
          {
            params: { ref: BRANCH },
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
          },
        );

        const size =
          data.size < 1024
            ? `${data.size} B`
            : data.size < 1024 * 1024
              ? `${(data.size / 1024).toFixed(1)} KB`
              : `${(data.size / (1024 * 1024)).toFixed(1)} MB`;

        const message = `ℹ️ *Info File GitHub*\n━━━━━━━━━━━━━━━━━━━━━━\n📄 Nama: ${data.name}\n📍 Path: ${data.path}\n💾 Size: ${size}\n🔖 Type: ${data.type}\n🆔 SHA: ${data.sha.slice(0, 7)}...\n🔗 URL: ${data.html_url}\n📅 Last commit: ${new Date(data.download_url ? Date.now() : "").toLocaleString() || "-"}`;

        return m.reply(message);
      } catch (error) {
        if (error.response?.status === 404) {
          return m.reply(`❌ File tidak ditemukan di GitHub: ${cleanPath}`);
        }
        return m.reply(
          `❌ Gagal mengambil info: ${error.response?.data?.message || error.message}`,
        );
      }
    }

    const repoPath = args[0].replace(/^\.\//, "");

    const fullPath = path.resolve(process.cwd(), repoPath);
    if (!fs.existsSync(fullPath)) {
      return m.reply(`❌ File tidak ditemukan: ${repoPath}`);
    }

    if (fs.statSync(fullPath).isDirectory()) {
      return m.reply(
        `❌ Tidak bisa upload folder.\nGunakan .upsc list ${repoPath} untuk melihat isi folder`,
      );
    }

    await m.reply(
      `📤 Mengupload *${repoPath}* ke GitHub...\n⏳ Mohon tunggu...`,
    );

    try {
      const result = await uploadFile(repoPath, token);

      if (!result.ok) {
        return m.reply(`❌ Gagal: ${result.reason}`);
      }

      const actionText =
        result.action === "created" ? "membuat file baru" : "menimpa file";
      const fileSize = fs.statSync(fullPath).size;
      const sizeText =
        fileSize < 1024
          ? `${fileSize} B`
          : fileSize < 1024 * 1024
            ? `${(fileSize / 1024).toFixed(1)} KB`
            : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

      const message = `✅ *Berhasil ${actionText}*\n\n📄 ${repoPath}\n💾 ${sizeText}\n🔗 ${result.url}\n📦 Repo: ${REPO_OWNER}/${REPO_NAME}\n🌿 Branch: ${BRANCH}`;

      return m.reply(message);
    } catch (error) {
      console.error("Upload error:", error);

      let errorMsg = error.response?.data?.message || error.message;

      if (errorMsg.includes("sha")) {
        errorMsg = "Conflict: File mungkin sudah ada dengan SHA berbeda";
      } else if (errorMsg.includes("push")) {
        errorMsg = "Token tidak memiliki izin push";
      } else if (errorMsg.includes("rate limit")) {
        errorMsg = "Rate limit GitHub tercapai, coba lagi nanti";
      }

      return m.reply(`❌ Gagal upload: ${errorMsg}`);
    }
  },
};

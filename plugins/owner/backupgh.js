import axios from "axios";
import fs from "fs";
import path from "path";

const IGNORE_LIST = [
  "node_modules",
  ".git",
  ".cache",
  ".npm",
  "sessions",
  "tmp",
  "package-lock.json ",
  "config.js",
];
const SECRET_PATTERN = /ghp_[a-zA-Z0-9]{36}/g;

function sanitize(content) {
  return content.replace(SECRET_PATTERN, "YOUR_TOKEN");
}

function formatBytes(bytes) {
  if (!bytes) return "0B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + sizes[i];
}

function collectFiles(dir, base = "") {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    if (IGNORE_LIST.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const repoPath = path.join(base, item).replace(/\\/g, "/");
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath, repoPath));
    } else {
      results.push({ fullPath, repoPath });
    }
  }
  return results;
}

async function uploadFile(
  fullPath,
  repoPath,
  repoOwner,
  repoName,
  branch,
  token,
) {
  try {
    const stat = fs.statSync(fullPath);
    if (stat.size > 95 * 1024 * 1024) return false;

    const raw = fs.readFileSync(fullPath);
    const isText =
      /\.(js|mjs|cjs|ts|json|md|txt|html|css|sh|yml|yaml|env|cfg|conf|ini)$/i.test(
        fullPath,
      );
    const content = isText
      ? Buffer.from(sanitize(raw.toString("utf-8"))).toString("base64")
      : raw.toString("base64");

    let sha;
    try {
      const meta = await axios.get(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoPath}?ref=${branch}`,
        { headers: { Authorization: `token ${token}` } },
      );
      sha = meta.data.sha;
    } catch {}

    await axios.put(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${repoPath}`,
      {
        message: `backup: ${repoPath}`,
        content,
        branch,
        ...(sha ? { sha } : {}),
      },
      {
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return true;
  } catch {
    return false;
  }
}

export default {
  name: "backupgh",
  category: "owner",
  command: ["backupgh", "bpgh"],
  alias: ["sv", "updaterepo"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const repoOwner = "bayuasli";
    const repoName = "SbyuxdBot-V2";
    const token = global.githubToken;
    const branch = "main";

    if (!token) return m.reply("githubToken belum diset di config.js.");

    try {
      const allFiles = collectFiles(process.cwd());
      await m.reply(
        `Total file terdeteksi: ${allFiles.length}\nMemulai upload...`,
      );

      let success = 0;
      let failed = 0;

      for (const file of allFiles) {
        const ok = await uploadFile(
          file.fullPath,
          file.repoPath,
          repoOwner,
          repoName,
          branch,
          token,
        );
        if (ok) success++;
        else failed++;
        await new Promise((r) => setTimeout(r, 250));
      }

      return m.reply(
        `Backup selesai.\n\n` +
          `Berhasil : ${success} file\n` +
          `Gagal    : ${failed} file\n\n` +
          `Catatan  : Semua token ghp_* dalam file teks diganti dengan YOUR_TOKEN sebelum diupload.\n\n` +
          `Repo     : https://github.com/${repoOwner}/${repoName}/tree/${branch}`,
      );
    } catch (err) {
      return m.reply(`Backup gagal: ${err.message}`);
    }
  },
};

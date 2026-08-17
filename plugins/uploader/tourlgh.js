import axios from "axios";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

async function ensureRepoExists(owner, repo, token) {
  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    if (err.response?.status === 404) {
      await axios.post(
        "https://api.github.com/user/repos",
        { name: repo, private: false, auto_init: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } else {
      throw err;
    }
  }
}

async function uploadFileToGitHub(buffer) {
  const { owner, branch, repos } = global.uploaderConfig;
  const token = global.githubToken;

  const detected = await fileTypeFromBuffer(buffer);
  const ext = detected?.ext || "bin";
  const code = crypto.randomBytes(3).toString("hex");
  const fileName = `${code}-${Date.now()}.${ext}`;
  const filePath = `uploads/${fileName}`;
  const base64Content = buffer.toString("base64");

  let targetRepo = repos[Math.floor(Math.random() * repos.length)];

  try {
    await ensureRepoExists(owner, targetRepo, token);
  } catch {
    targetRepo = `dat-${crypto.randomBytes(3).toString("hex")}`;
    await ensureRepoExists(owner, targetRepo, token);
  }

  await axios.put(
    `https://api.github.com/repos/${owner}/${targetRepo}/contents/${filePath}`,
    {
      message: `upload: ${fileName}`,
      content: base64Content,
      branch,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  return `https://raw.githubusercontent.com/${owner}/${targetRepo}/${branch}/${filePath}`;
}

export default {
  name: "tourlgh",
  category: "uploader",
  command: ["tourlgh", "upgh", "urlgh"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (!global.githubToken)
      return m.reply("githubToken belum diset di config.js.");
    if (!global.uploaderConfig)
      return m.reply("uploaderConfig belum diset di config.js.");

    const quoted = m.isQuoted ? m.quoted : m;
    const mime = quoted.msg?.mimetype || quoted.mimetype || "";

    if (!mime) return m.reply("Reply file yang ingin diupload ke GitHub.");

    await m.reply("Mengupload file ke GitHub...");

    try {
      const buffer = await conn.downloadMediaMessage(quoted);
      if (!buffer?.length) return m.reply("Gagal mendownload file.");

      const url = await uploadFileToGitHub(buffer);
      return m.reply(`Upload berhasil.\n\n${url}`);
    } catch (err) {
      return m.reply(`Gagal mengupload: ${err.message}`);
    }
  },
};

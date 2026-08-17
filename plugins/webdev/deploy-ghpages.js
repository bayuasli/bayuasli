import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";

const GH_API = "https://api.github.com";

const getHeaders = () => ({
  Authorization: `Bearer ${global.githubToken}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function getAuthUser() {
  const res = await axios.get(`${GH_API}/user`, { headers: getHeaders() });
  return res.data.login;
}

async function repoExists(owner, repo) {
  try {
    await axios.get(`${GH_API}/repos/${owner}/${repo}`, {
      headers: getHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

async function createRepo(repo) {
  await axios.post(
    `${GH_API}/user/repos`,
    { name: repo, private: false, auto_init: false },
    { headers: getHeaders() },
  );
}

async function getFileSha(owner, repo, filePath) {
  try {
    const res = await axios.get(
      `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: getHeaders(),
        params: { ref: "main" },
      },
    );
    return res.data.sha;
  } catch {
    return null;
  }
}

async function upsertFile(owner, repo, filePath, content) {
  const sha = await getFileSha(owner, repo, filePath);
  const body = {
    message: `deploy: ${filePath}`,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  await axios.put(
    `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`,
    body,
    { headers: getHeaders() },
  );
}

async function enablePages(owner, repo) {
  try {
    await axios.post(
      `${GH_API}/repos/${owner}/${repo}/pages`,
      { source: { branch: "main", path: "/" } },
      { headers: getHeaders() },
    );
  } catch (err) {
    if (err?.response?.status !== 409) throw err;
  }
}

function collectFiles(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, base));
    } else {
      result.push({
        filePath: path.relative(base, fullPath).replace(/\\/g, "/"),
        content: fs.readFileSync(fullPath),
      });
    }
  }
  return result;
}

export default {
  name: "deploy-ghpages",
  category: "webdev",
  command: ["ghpages"],
  alias: ["ghp"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM }) => {
    const quoted = m.isQuoted ? m.quoted : null;

    if (!quoted?.isMedia) {
      return m.reply(
        "Reply file zip yang berisi struktur web.\n\nContoh: .ghpages nama-repo",
      );
    }

    const repoName = m.text?.trim();
    if (!repoName) {
      return m.reply("Sertakan nama repo.\n\nContoh: .ghpages nama-repo");
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(repoName)) {
      return m.reply(
        "Nama repo tidak valid. Gunakan huruf, angka, titik, atau strip saja.",
      );
    }

    if (!global.githubToken) {
      return m.reply("githubToken belum diset di config.js.");
    }

    await m.reply("Memproses deploy ke GitHub Pages...");

    const tmpBase = path.join(process.cwd(), "tmp", `ghp_${Date.now()}`);
    const zipPath = path.join(tmpBase, "upload.zip");
    const extractPath = path.join(tmpBase, "web");

    try {
      fs.mkdirSync(extractPath, { recursive: true });

      const buffer = await downloadM();
      fs.writeFileSync(zipPath, buffer);

      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      const entries = zip.getEntries();
      const topDirs = [
        ...new Set(entries.map((e) => e.entryName.split("/")[0])),
      ];
      let webRoot = extractPath;
      if (
        topDirs.length === 1 &&
        fs.statSync(path.join(extractPath, topDirs[0])).isDirectory()
      ) {
        webRoot = path.join(extractPath, topDirs[0]);
      }

      const hasIndex = fs.existsSync(path.join(webRoot, "index.html"));
      if (!hasIndex) {
        return m.reply("File index.html tidak ditemukan di dalam zip.");
      }

      const ghUser = await getAuthUser();
      const exists = await repoExists(ghUser, repoName);
      if (!exists) await createRepo(repoName);

      const files = collectFiles(webRoot);
      await m.reply(`Repo siap. Mengupload ${files.length} file...`);

      for (const file of files) {
        await upsertFile(ghUser, repoName, file.filePath, file.content);
      }

      await enablePages(ghUser, repoName);

      const deployUrl = `https://${ghUser}.github.io/${repoName}`;
      await m.reply(
        `Deploy selesai.\n\nRepo  : https://github.com/${ghUser}/${repoName}\nURL   : ${deployUrl}\n\nHalaman bisa memerlukan 1-2 menit untuk aktif.`,
      );
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      await m.reply(`Deploy gagal: ${msg}`);
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  },
};

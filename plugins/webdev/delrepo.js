import axios from "axios";

const GH_API = "https://api.github.com";

const getHeaders = () => ({
  Authorization: `Bearer ${global.githubToken}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function getRepoContents(owner, repo, path = "") {
  const res = await axios.get(
    `${GH_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: getHeaders() },
  );
  return res.data;
}

async function deleteFile(owner, repo, filePath, sha) {
  await axios.delete(`${GH_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    headers: getHeaders(),
    data: {
      message: `delete: ${filePath}`,
      sha,
    },
  });
}

async function getAllFiles(owner, repo, path = "") {
  const contents = await getRepoContents(owner, repo, path);
  const files = [];

  for (const item of contents) {
    if (item.type === "file") {
      files.push({ path: item.path, sha: item.sha });
    } else if (item.type === "dir") {
      const subFiles = await getAllFiles(owner, repo, item.path);
      files.push(...subFiles);
    }
  }

  return files;
}

async function getGhUser() {
  const res = await axios.get(`${GH_API}/user`, { headers: getHeaders() });
  return res.data.login;
}

const HELP =
  `Delete Isi Repo GitHub\n\n` +
  `Perintah ini menghapus SEMUA ISI repo, bukan repo itu sendiri.\n` +
  `Repo tetap ada, hanya seluruh file di dalamnya yang dihapus.\n\n` +
  `.delrepo <nama-repo>\n\n` +
  `Contoh:\n` +
  `.delrepo dat1\n` +
  `.delrepo SbyuxdBot-V2`;

export default {
  name: "delrepo",
  category: "webdev",
  command: ["delrepo", "clearrepo"],
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
    if (!global.githubToken)
      return m.reply("githubToken belum diset di config.js.");

    const repoName = m.args[0]?.trim();
    if (!repoName) return m.reply(HELP);

    await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    try {
      const owner = await getGhUser();

      await m.reply(`Mengambil daftar file dari ${owner}/${repoName}...`);

      const files = await getAllFiles(owner, repoName);

      if (!files.length) {
        await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
        return m.reply(
          `Repo ${repoName} sudah kosong, tidak ada file yang dihapus.`,
        );
      }

      await m.reply(
        `Menghapus ${files.length} file dari ${owner}/${repoName}...`,
      );

      let deleted = 0;
      let failed = 0;

      for (const file of files) {
        try {
          await deleteFile(owner, repoName, file.path, file.sha);
          deleted++;
          await new Promise((r) => setTimeout(r, 300));
        } catch {
          failed++;
        }
      }

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
      return m.reply(
        `Selesai membersihkan repo.\n\n` +
          `Repo    : ${owner}/${repoName}\n` +
          `Dihapus : ${deleted} file\n` +
          (failed ? `Gagal   : ${failed} file\n` : "") +
          `\nRepo masih ada, hanya isinya yang dikosongkan.`,
      );
    } catch (err) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      const msg = err?.response?.data?.message || err.message;
      return m.reply(`Gagal: ${msg}`);
    }
  },
};

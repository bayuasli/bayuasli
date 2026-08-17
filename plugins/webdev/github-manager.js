import axios from "axios";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs";
import { Button } from "#helper";

const GH_API = "https://api.github.com";

function getHeaders() {
  return {
    Authorization: `Bearer ${global.githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getAuthUser() {
  const { data } = await axios.get(`${GH_API}/user`, { headers: getHeaders() });
  return data.login;
}

async function listRepos(user) {
  const { data } = await axios.get(`${GH_API}/user/repos`, {
    headers: getHeaders(),
    params: { per_page: 100, sort: "updated" },
  });
  return data;
}

async function createRepo(name, isPrivate, description) {
  const { data } = await axios.post(
    `${GH_API}/user/repos`,
    {
      name,
      private: isPrivate,
      description,
      auto_init: true,
    },
    { headers: getHeaders() },
  );
  return data;
}

async function deleteRepo(user, repo) {
  await axios.delete(`${GH_API}/repos/${user}/${repo}`, {
    headers: getHeaders(),
  });
}

async function renameRepo(user, oldName, newName) {
  const { data } = await axios.patch(
    `${GH_API}/repos/${user}/${oldName}`,
    {
      name: newName,
    },
    { headers: getHeaders() },
  );
  return data;
}

async function getRepo(user, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${user}/${repo}`, {
    headers: getHeaders(),
  });
  return data;
}

async function setVisibility(user, repo, isPrivate) {
  const { data } = await axios.patch(
    `${GH_API}/repos/${user}/${repo}`,
    {
      private: isPrivate,
    },
    { headers: getHeaders() },
  );
  return data;
}

async function ensureRepo(owner, repo) {
  try {
    await axios.get(`${GH_API}/repos/${owner}/${repo}`, {
      headers: getHeaders(),
    });
  } catch {
    await axios.post(
      `${GH_API}/user/repos`,
      {
        name: repo,
        private: false,
        auto_init: true,
      },
      { headers: getHeaders() },
    );
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function parseOwnerRepo(input, defaultOwner) {
  if (input.includes("/")) {
    const [owner, repo] = input.split("/");
    return { owner, repo };
  }
  return { owner: defaultOwner, repo: input };
}

async function whoami() {
  const { data } = await axios.get(`${GH_API}/user`, { headers: getHeaders() });
  return data;
}

async function getRateLimit() {
  const { data } = await axios.get(`${GH_API}/rate_limit`, {
    headers: getHeaders(),
  });
  return data;
}

async function searchRepos(query) {
  const { data } = await axios.get(`${GH_API}/search/repositories`, {
    headers: getHeaders(),
    params: { q: query, per_page: 10, sort: "stars", order: "desc" },
  });
  return data.items;
}

async function starRepo(owner, repo) {
  await axios.put(
    `${GH_API}/user/starred/${owner}/${repo}`,
    {},
    { headers: getHeaders() },
  );
}

async function unstarRepo(owner, repo) {
  await axios.delete(`${GH_API}/user/starred/${owner}/${repo}`, {
    headers: getHeaders(),
  });
}

async function forkRepo(owner, repo) {
  const { data } = await axios.post(
    `${GH_API}/repos/${owner}/${repo}/forks`,
    {},
    { headers: getHeaders() },
  );
  return data;
}

async function listBranches(owner, repo) {
  const { data } = await axios.get(
    `${GH_API}/repos/${owner}/${repo}/branches`,
    { headers: getHeaders() },
  );
  return data;
}

async function listCommits(owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}/commits`, {
    headers: getHeaders(),
    params: { per_page: 10 },
  });
  return data;
}

async function getReadme(owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}/readme`, {
    headers: getHeaders(),
  });
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function downloadRepoZip(owner, repo, branch = "main") {
  const res = await axios.get(
    `${GH_API}/repos/${owner}/${repo}/zipball/${branch}`,
    {
      headers: getHeaders(),
      responseType: "arraybuffer",
    },
  );
  return Buffer.from(res.data);
}

async function getFileSha(owner, repo, filePath) {
  try {
    const res = await axios.get(
      `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`,
      { headers: getHeaders() },
    );
    return res.data.sha;
  } catch {
    return null;
  }
}

async function uploadFile(owner, repo, filePath, content) {
  const sha = await getFileSha(owner, repo, filePath);
  const body = {
    message: `upload: ${filePath}`,
    content: content.toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  await axios.put(
    `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`,
    body,
    { headers: getHeaders() },
  );
}

function showMainMenu(conn, m) {
  return new Button(conn)
    .setTitle("GitHub Manager")
    .setBody("Pilih aksi yang mau dilakukan:")
    .setFooter("SbyuXd GitHub Manager")
    .addSelection("Pilih Menu")
    .makeSection("Repo Saya")
    .makeRow("", "List Repo", "Lihat semua repo kamu", ".git list")
    .makeRow("", "Buat Repo", "Ketik: .git create <nama>", ".git create")
    .makeRow("", "Hapus Repo", "Ketik: .git delete <nama>", ".git delete")
    .makeRow(
      "",
      "Rename Repo",
      "Ketik: .git rename <lama> <baru>",
      ".git rename",
    )
    .makeRow("", "Info Repo", "Ketik: .git info <nama>", ".git info")
    .makeRow(
      "",
      "Ubah Visibility",
      "Ketik: .git private/public <nama>",
      ".git private",
    )
    .makeRow(
      "",
      "Upload ZIP",
      "Reply file zip + .git upload <nama>",
      ".git upload",
    )
    .makeSection("Explore & Sosial")
    .makeRow("", "Cari Repo", "Ketik: .git search <keyword>", ".git search")
    .makeRow("", "Star Repo", "Ketik: .git star <owner/repo>", ".git star")
    .makeRow("", "Fork Repo", "Ketik: .git fork <owner/repo>", ".git fork")
    .makeRow("", "Lihat Branch", "Ketik: .git branches <nama>", ".git branches")
    .makeRow("", "Lihat Commit", "Ketik: .git commits <nama>", ".git commits")
    .makeRow("", "Baca README", "Ketik: .git readme <nama>", ".git readme")
    .makeRow(
      "",
      "Download Repo",
      "Ketik: .git download <nama>",
      ".git download",
    )
    .makeSection("Akun")
    .makeRow("", "Info Akun", "Lihat profil GitHub kamu", ".git whoami")
    .makeRow("", "Cek Rate Limit", "Lihat sisa kuota API", ".git ratelimit")
    .send(m.chat, { quoted: m });
}

export default {
  name: "github-manager",
  category: "webdev",
  command: ["git"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM }) => {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();

    if (!sub) return showMainMenu(conn, m);

    if (!global.githubToken)
      return m.reply("githubToken belum diset di config.js.");

    try {
      if (sub === "upload") {
        const quoted = m.isQuoted ? m.quoted : null;
        const mime = quoted?.msg?.mimetype || quoted?.mimetype || "";

        if (!quoted?.isMedia || !/zip/i.test(mime)) {
          return m.reply("Reply file ZIP, lalu:\n.git upload <nama-repo>");
        }

        const repoName = args[1]?.trim();
        if (!repoName)
          return m.reply("Format: .git upload <nama-repo> (reply file zip)");

        await conn.sendMessage(m.chat, { react: { text: "?", key: m.key } });

        const tmpBase = path.join(process.cwd(), "tmp", `uprepo_${Date.now()}`);
        fs.mkdirSync(tmpBase, { recursive: true });

        try {
          const buffer = await downloadM();
          const zipPath = path.join(tmpBase, "upload.zip");
          fs.writeFileSync(zipPath, buffer);

          const zip = new AdmZip(zipPath);
          const entries = zip.getEntries().filter((e) => !e.isDirectory);

          if (!entries.length) {
            await conn.sendMessage(m.chat, {
              react: { text: "?", key: m.key },
            });
            return m.reply("ZIP kosong atau tidak berisi file.");
          }

          const owner = await getAuthUser();
          await ensureRepo(owner, repoName);

          await m.reply(
            `Mengupload ${entries.length} file ke ${owner}/${repoName}...`,
          );

          let uploaded = 0;
          let failed = 0;

          for (const entry of entries) {
            try {
              const content = entry.getData();
              let filePath = entry.entryName;

              const parts = filePath.split("/");
              if (parts.length > 1) {
                const topDirs = [
                  ...new Set(entries.map((e) => e.entryName.split("/")[0])),
                ];
                if (
                  topDirs.length === 1 &&
                  entries.every((e) => e.entryName.startsWith(topDirs[0] + "/"))
                ) {
                  filePath = parts.slice(1).join("/");
                }
              }

              if (!filePath) continue;

              await uploadFile(owner, repoName, filePath, content);
              uploaded++;
              await new Promise((r) => setTimeout(r, 300));
            } catch {
              failed++;
            }
          }

          const rawBase = `https://raw.githubusercontent.com/${owner}/${repoName}/main`;
          const repoUrl = `https://github.com/${owner}/${repoName}`;

          await conn.sendMessage(m.chat, { react: { text: "?", key: m.key } });

          return new Button(conn)
            .setBody(
              `Upload selesai.\n\n` +
                `Repo     : ${owner}/${repoName}\n` +
                `Diupload : ${uploaded} file\n` +
                (failed ? `Gagal    : ${failed} file\n` : "") +
                `Raw URL  : ${rawBase}/<nama-file>`,
            )
            .addUrl("Buka Repo", repoUrl, false)
            .send(m.chat, { quoted: m });
        } finally {
          fs.rmSync(tmpBase, { recursive: true, force: true });
        }
      }

      const user = await getAuthUser();

      switch (sub) {
        case "list": {
          const repos = await listRepos(user);
          if (!repos.length) return m.reply("Repo kosong.");

          let txt = `Repo ${user}:\n\n`;
          repos.slice(0, 20).forEach((r, i) => {
            txt += `${i + 1}. ${r.name} [${r.private ? "private" : "public"}]\n`;
          });

          return m.reply(txt.trim());
        }

        case "create": {
          const name = args[1];
          if (!name)
            return m.reply("Format: .git create <nama> [private] [deskripsi]");

          const isPrivate = args.includes("private");
          const desc = args
            .slice(2)
            .filter((a) => a !== "private")
            .join(" ");

          const r = await createRepo(name, isPrivate, desc);

          return new Button(conn)
            .setBody(
              `Repo berhasil dibuat!\n\n` +
                `Nama       : ${r.name}\n` +
                `Visibility : ${r.private ? "private" : "public"}`,
            )
            .addUrl("Buka Repo", r.html_url, false)
            .send(m.chat, { quoted: m });
        }

        case "delete": {
          const name = args[1];
          if (!name) return m.reply("Format: .git delete <nama>");

          await deleteRepo(user, name);
          return m.reply(`Repo dihapus: ${name}`);
        }

        case "rename": {
          const oldName = args[1];
          const newName = args[2];
          if (!oldName || !newName)
            return m.reply("Format: .git rename <lama> <baru>");

          const r = await renameRepo(user, oldName, newName);
          return m.reply(`Repo di-rename:\n${oldName} -> ${r.name}`);
        }

        case "info": {
          const name = args[1];
          if (!name) return m.reply("Format: .git info <nama>");

          const r = await getRepo(user, name);

          return new Button(conn)
            .setBody(
              `Repo    : ${r.name}\n` +
                `Desc    : ${r.description || "-"}\n` +
                `Visibility : ${r.private ? "private" : "public"}\n` +
                `Stars   : ${r.stargazers_count}\n` +
                `Forks   : ${r.forks_count}\n` +
                `Bahasa  : ${r.language || "-"}`,
            )
            .addUrl("Buka Repo", r.html_url, false)
            .send(m.chat, { quoted: m });
        }

        case "private":
        case "public": {
          const name = args[1];
          if (!name) return m.reply("Format: .git private/public <nama>");

          const isPrivate = sub === "private";
          await setVisibility(user, name, isPrivate);

          return m.reply(`${name} -> ${isPrivate ? "private" : "public"}`);
        }

        case "whoami": {
          const info = await whoami();
          return new Button(conn)
            .setBody(
              `Login sebagai : ${info.login}\n` +
                `Nama     : ${info.name || "-"}\n` +
                `Bio      : ${info.bio || "-"}\n` +
                `Repo     : ${info.public_repos}\n` +
                `Followers: ${info.followers}\n` +
                `Following: ${info.following}`,
            )
            .addUrl("Buka Profile", info.html_url, false)
            .send(m.chat, { quoted: m });
        }

        case "ratelimit": {
          const rl = await getRateLimit();
          const core = rl.resources.core;
          const resetDate = new Date(core.reset * 1000).toLocaleString("id-ID");
          return m.reply(
            `Rate Limit GitHub API:\n\n` +
              `Limit : ${core.limit}\n` +
              `Sisa  : ${core.remaining}\n` +
              `Reset : ${resetDate}`,
          );
        }

        case "search": {
          const query = args.slice(1).join(" ");
          if (!query) return m.reply("Format: .git search <keyword>");

          const results = await searchRepos(query);
          if (!results.length) return m.reply("Nggak ada hasil.");

          let txt = `Hasil pencarian "${query}":\n\n`;
          results.forEach((r, i) => {
            txt += `${i + 1}. ${r.full_name} ?${r.stargazers_count}\n${r.html_url}\n\n`;
          });

          return m.reply(txt.trim());
        }

        case "star":
        case "unstar": {
          const target = args[1];
          if (!target)
            return m.reply(`Format: .git ${sub} <owner/repo atau nama>`);

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          if (sub === "star") await starRepo(o, r);
          else await unstarRepo(o, r);

          return m.reply(
            `${sub === "star" ? "Berhasil star" : "Berhasil unstar"}: ${o}/${r}`,
          );
        }

        case "fork": {
          const target = args[1];
          if (!target) return m.reply("Format: .git fork <owner/repo>");

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          const forked = await forkRepo(o, r);

          return new Button(conn)
            .setBody(`Fork berhasil!\n\n${forked.full_name}`)
            .addUrl("Buka Repo", forked.html_url, false)
            .send(m.chat, { quoted: m });
        }

        case "branches": {
          const target = args[1];
          if (!target) return m.reply("Format: .git branches <nama>");

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          const branches = await listBranches(o, r);
          if (!branches.length) return m.reply("Nggak ada branch.");

          return m.reply(
            `Branch ${o}/${r}:\n\n` +
              branches.map((b) => `- ${b.name}`).join("\n"),
          );
        }

        case "commits": {
          const target = args[1];
          if (!target) return m.reply("Format: .git commits <nama>");

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          const commits = await listCommits(o, r);
          if (!commits.length) return m.reply("Belum ada commit.");

          let txt = `Commit terbaru ${o}/${r}:\n\n`;
          commits.forEach((c) => {
            const msg = c.commit.message.split("\n")[0];
            const author = c.commit.author.name;
            txt += `- ${msg} (${author})\n`;
          });

          return m.reply(txt.trim());
        }

        case "readme": {
          const target = args[1];
          if (!target) return m.reply("Format: .git readme <nama>");

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          const content = await getReadme(o, r);

          if (content.length > 3500) {
            return conn.sendMessage(
              m.chat,
              {
                document: Buffer.from(content, "utf-8"),
                mimetype: "text/markdown",
                fileName: "README.md",
                caption: `README ${o}/${r}`,
              },
              { quoted: m },
            );
          }

          return m.reply(content);
        }

        case "download": {
          const target = args[1];
          if (!target) return m.reply("Format: .git download <nama> [branch]");

          const { owner: o, repo: r } = parseOwnerRepo(target, user);
          const branch = args[2] || "main";

          await conn.sendMessage(m.chat, { react: { text: "?", key: m.key } });
          const zipBuffer = await downloadRepoZip(o, r, branch);
          await conn.sendMessage(m.chat, { react: { text: "?", key: m.key } });

          return conn.sendMessage(
            m.chat,
            {
              document: zipBuffer,
              mimetype: "application/zip",
              fileName: `${r}-${branch}.zip`,
              caption: `${o}/${r} (${branch})`,
            },
            { quoted: m },
          );
        }

        default:
          return m.reply(
            "Subcommand tidak dikenali. Ketik .git buat lihat menu.",
          );
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      return m.reply("Error: " + msg);
    }
  },
};

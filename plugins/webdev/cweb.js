import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import AdmZip from "adm-zip";
import { ButtonV2 } from "#helper";

const VC_API = "https://api.vercel.com";
const GH_API = "https://api.github.com";

const pendingDeploy = new Map();
const EXPIRY_MS = 10 * 60 * 1000;

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pendingDeploy) {
    if (now - val.timestamp > EXPIRY_MS) pendingDeploy.delete(key);
  }
}

const vcHeaders = () => ({
  Authorization: "Bearer " + global.vercelToken,
  "Content-Type": "application/json",
});

const ghHeaders = () => ({
  Authorization: "Bearer " + global.githubToken,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

function sha1(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
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

async function react(conn, m, emoji) {
  await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
}

async function send(conn, m, text) {
  await conn.sendMessage(m.chat, { text }, { quoted: m });
}

function extractFiles(buffer, mime, tmpBase) {
  const extractPath = path.join(tmpBase, "web");
  fs.mkdirSync(extractPath, { recursive: true });

  if (/zip/i.test(mime)) {
    const zipPath = path.join(tmpBase, "upload.zip");
    fs.writeFileSync(zipPath, buffer);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const entries = zip.getEntries();
    const topDirs = [...new Set(entries.map((e) => e.entryName.split("/")[0]))];
    let webRoot = extractPath;

    if (
      topDirs.length === 1 &&
      fs.existsSync(path.join(extractPath, topDirs[0])) &&
      fs.statSync(path.join(extractPath, topDirs[0])).isDirectory()
    ) {
      webRoot = path.join(extractPath, topDirs[0]);
    }

    if (!fs.existsSync(path.join(webRoot, "index.html"))) {
      throw new Error("File index.html tidak ditemukan di dalam ZIP.");
    }

    return collectFiles(webRoot);
  }

  const htmlPath = path.join(extractPath, "index.html");
  fs.writeFileSync(htmlPath, buffer);
  return [{ filePath: "index.html", content: buffer }];
}

async function uploadFileVercel(buffer) {
  await axios
    .post(VC_API + "/v2/files", buffer, {
      headers: {
        Authorization: "Bearer " + global.vercelToken,
        "Content-Type": "application/octet-stream",
        "x-vercel-digest": sha1(buffer),
      },
    })
    .catch(() => {});
}

async function ensureVercelProject(webName) {
  await axios
    .post(VC_API + "/v9/projects", { name: webName }, { headers: vcHeaders() })
    .catch(() => {});
}

async function createVercelDeployment(webName, files) {
  const res = await axios.post(
    VC_API + "/v13/deployments",
    {
      name: webName,
      project: webName,
      files: files.map((f) => ({
        file: f.filePath,
        sha: sha1(f.content),
        size: f.content.length,
      })),
      projectSettings: { framework: null },
    },
    { headers: vcHeaders() },
  );
  return res.data;
}

async function waitForReady(deploymentId, maxWait = 60000) {
  const interval = 4000;
  let elapsed = 0;
  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
    const res = await axios.get(VC_API + "/v13/deployments/" + deploymentId, {
      headers: vcHeaders(),
    });
    const state = res.data.readyState;
    if (state === "READY") return res.data;
    if (state === "ERROR" || state === "CANCELED")
      throw new Error("Deployment state: " + state);
  }
  throw new Error("Timeout menunggu deployment selesai.");
}

async function deployToVercel(conn, m, webName, files) {
  for (const file of files) await uploadFileVercel(file.content);

  await ensureVercelProject(webName);
  const deployment = await createVercelDeployment(webName, files);
  await waitForReady(deployment.id);

  const vercelUrl = "https://" + webName + ".vercel.app";

  await react(conn, m, "✅");
  await send(
    conn,
    m,
    "Deploy Selesai! (Vercel)\n\n" +
      "Project : " +
      webName +
      "\n" +
      "Vercel  : " +
      vercelUrl +
      "\n" +
      "Status  : Online",
  );
}

async function getGhUser() {
  const res = await axios.get(GH_API + "/user", { headers: ghHeaders() });
  return res.data.login;
}

async function ghRepoExists(owner, repo) {
  try {
    await axios.get(GH_API + "/repos/" + owner + "/" + repo, {
      headers: ghHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

async function createGhRepo(repo) {
  await axios.post(
    GH_API + "/user/repos",
    { name: repo, private: false, auto_init: false },
    { headers: ghHeaders() },
  );
}

async function getGhFileSha(owner, repo, filePath) {
  try {
    const res = await axios.get(
      GH_API + "/repos/" + owner + "/" + repo + "/contents/" + filePath,
      {
        headers: ghHeaders(),
        params: { ref: "main" },
      },
    );
    return res.data.sha;
  } catch {
    return null;
  }
}

async function upsertGhFile(owner, repo, filePath, content) {
  const sha = await getGhFileSha(owner, repo, filePath);
  const body = {
    message: "deploy: " + filePath,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  await axios.put(
    GH_API + "/repos/" + owner + "/" + repo + "/contents/" + filePath,
    body,
    { headers: ghHeaders() },
  );
}

async function enablePages(owner, repo) {
  try {
    await axios.post(
      GH_API + "/repos/" + owner + "/" + repo + "/pages",
      { source: { branch: "main", path: "/" } },
      { headers: ghHeaders() },
    );
  } catch (err) {
    if (err?.response?.status !== 409) throw err;
  }
}

async function deployToGithub(conn, m, webName, files) {
  const ghUser = await getGhUser();
  const exists = await ghRepoExists(ghUser, webName);
  if (!exists) await createGhRepo(webName);

  await send(conn, m, "Repo siap. Mengupload " + files.length + " file...");

  for (const file of files) {
    await upsertGhFile(ghUser, webName, file.filePath, file.content);
  }

  await enablePages(ghUser, webName);

  const deployUrl = "https://" + ghUser + ".github.io/" + webName;

  await react(conn, m, "✅");
  await send(
    conn,
    m,
    "Deploy Selesai! (GitHub Pages)\n\n" +
      "Repo : https://github.com/" +
      ghUser +
      "/" +
      webName +
      "\n" +
      "URL  : " +
      deployUrl +
      "\n\n" +
      "Halaman bisa memerlukan 1-2 menit untuk aktif.",
  );
}

export default {
  name: "deploy",
  category: "webdev",
  command: ["cweb"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { downloadM, quoted }) => {
    cleanExpired();

    const target = m.args?.[0]?.toLowerCase();

    if (target === "batal") {
      pendingDeploy.delete(m.sender);
      return send(conn, m, "Deploy dibatalkan.");
    }

    if (!target || !["vercel", "github"].includes(target)) {
      const mime = quoted?.msg?.mimetype || quoted?.mimetype || "";

      if (!m.isQuoted || !/zip|html/i.test(mime)) {
        return send(
          conn,
          m,
          "Reply file ZIP atau HTML.\nContoh: .cweb namaweb",
        );
      }

      const webName = m.text
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "");
      if (!webName)
        return send(conn, m, "Sertakan nama website.\nContoh: .cweb namaweb");

      const buffer = await downloadM();
      pendingDeploy.set(m.sender, {
        buffer,
        mime,
        webName,
        timestamp: Date.now(),
      });

      return new ButtonV2(conn)
        .setTitle("Deploy Website")
        .setSubtitle(webName)
        .setBody(
          "File terdeteksi: " +
            (/zip/i.test(mime) ? "ZIP" : "HTML") +
            "\nPilih platform tujuan deploy:",
        )
        .setFooter("SbyuXd Deploy")
        .setThumbnail(
          global.thumbnailUrl ||
            "https://img2.pixhost.to/images/9130/746977018_sbyuxd.jpg",
        )
        .addRawButton({
          buttonText: { displayText: "🚀 Pilih Platform" },
          buttonId: "deploy_target",
          type: 1,
          nativeFlowInfo: {
            name: "single_select",
            paramsJson: JSON.stringify({
              title: "Platform Deploy",
              sections: [
                {
                  title: "Pilih salah satu",
                  highlight_label: "",
                  rows: [
                    {
                      header: "",
                      title: "Vercel",
                      description: "Cepat dan auto HTTPS",
                      id: ".cweb vercel",
                    },
                    {
                      header: "",
                      title: "GitHub Pages",
                      description: "Gratis selamanya",
                      id: ".cweb github",
                    },
                  ],
                },
              ],
            }),
          },
        })
        .addButton("❌ Batal", ".cweb batal")
        .send(m.chat);
    }

    const cached = pendingDeploy.get(m.sender);
    if (!cached) {
      return send(
        conn,
        m,
        "Sesi deploy kadaluarsa atau tidak ditemukan. Reply file lagi dari awal.",
      );
    }

    const { buffer, mime, webName } = cached;
    const tmpBase = path.join(process.cwd(), "tmp", "deploy_" + Date.now());

    try {
      if (target === "vercel" && !global.vercelToken) {
        return send(conn, m, "vercelToken belum diset di config.js.");
      }
      if (target === "github" && !global.githubToken) {
        return send(conn, m, "githubToken belum diset di config.js.");
      }

      await react(conn, m, "⏳");
      fs.mkdirSync(tmpBase, { recursive: true });

      const files = extractFiles(buffer, mime, tmpBase);

      if (target === "vercel") {
        await deployToVercel(conn, m, webName, files);
      } else {
        await deployToGithub(conn, m, webName, files);
      }

      pendingDeploy.delete(m.sender);
    } catch (err) {
      await react(conn, m, "❌");
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err.message;
      await send(conn, m, "Deploy gagal: " + msg);
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  },
};

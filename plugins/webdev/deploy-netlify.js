import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";

const NF_API = "https://api.netlify.com/api/v1";

async function react(conn, m, emoji) {
  await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
}

const getHeaders = () => ({
  Authorization: `Bearer ${global.netlifyToken}`,
  "Content-Type": "application/json",
});

async function getSiteByName(name) {
  const res = await axios.get(`${NF_API}/sites`, {
    headers: getHeaders(),
    params: { filter: "all" },
  });
  return res.data.find((s) => s.name === name) || null;
}

async function createSite(name) {
  const res = await axios.post(
    `${NF_API}/sites`,
    { name },
    { headers: getHeaders() },
  );
  return res.data;
}

async function deployZip(siteId, zipBuffer) {
  const res = await axios.post(`${NF_API}/sites/${siteId}/deploys`, zipBuffer, {
    headers: {
      Authorization: `Bearer ${global.netlifyToken}`,
      "Content-Type": "application/zip",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return res.data;
}

async function waitForReady(deployId, maxWait = 120000) {
  const interval = 5000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;

    const res = await axios.get(`${NF_API}/deploys/${deployId}`, {
      headers: getHeaders(),
    });

    const state = res.data.state;
    if (state === "ready") return res.data;
    if (state === "error") throw new Error("Deploy gagal di sisi Netlify.");
  }

  throw new Error("Timeout menunggu deploy selesai.");
}

export default {
  name: "deploy-netlify",
  category: "webdev",
  command: ["netlify"],
  alias: ["nf"],

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
        "Reply file ZIP yang berisi struktur web.\n\nContoh: .netlify nama-site",
      );
    }

    const siteName = m.text?.trim();
    if (!siteName) {
      return m.reply("Sertakan nama site.\n\nContoh: .netlify nama-site");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(siteName)) {
      return m.reply(
        "Nama site tidak valid. Gunakan huruf, angka, strip, atau underscore saja.",
      );
    }

    if (!global.netlifyToken) {
      return m.reply("netlifyToken belum diset di config.js.");
    }

    await react(conn, m, "⏳");

    const tmpBase = path.join(process.cwd(), "tmp", `nf_${Date.now()}`);
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
        fs.existsSync(path.join(extractPath, topDirs[0])) &&
        fs.statSync(path.join(extractPath, topDirs[0])).isDirectory()
      ) {
        webRoot = path.join(extractPath, topDirs[0]);
      }

      if (!fs.existsSync(path.join(webRoot, "index.html"))) {
        return m.reply("File index.html tidak ditemukan di dalam ZIP.");
      }

      const deployZipPath = path.join(tmpBase, "deploy.zip");
      const deployZip = new AdmZip();
      const addToZip = (dir, base = "") => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          const zipPath = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            addToZip(fullPath, zipPath);
          } else {
            deployZip.addFile(zipPath, fs.readFileSync(fullPath));
          }
        }
      };
      addToZip(webRoot);
      deployZip.writeZip(deployZipPath);

      const deployZipBuffer = fs.readFileSync(deployZipPath);

      let site = await getSiteByName(siteName).catch(() => null);
      if (!site) {
        await react(conn, m, "🔧");
        site = await createSite(siteName);
      }

      await react(conn, m, "📦");
      const deploy = await deployZip(site.id, deployZipBuffer);

      await react(conn, m, "🔨");
      const ready = await waitForReady(deploy.id);

      const deployUrl = `https://${ready.ssl_url || ready.url || site.default_domain}`;

      await react(conn, m, "✅");
      return m.reply(
        `Deploy selesai.\n\nSite : ${siteName}\nURL  : ${deployUrl}`,
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        err.message;
      await react(conn, m, "❌");
      return m.reply(`Deploy gagal: ${msg}`);
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  },
};

import axios from "axios";
import fs from "fs";
import path from "path";

const REPO_OWNER = "sbyuxD";
const REPO_NAME = "WolfBot";
const BRANCH = "main";
const GH_API = "https://api.github.com";

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getFileSha(repoPath, token) {
  try {
    const { data } = await axios.get(
      `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
      {
        params: { ref: BRANCH },
        headers: getHeaders(token),
      }
    );
    return data.sha;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function uploadSingleFile(repoPath, token) {
  const fullPath = path.resolve(process.cwd(), repoPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File tidak ditemukan: ${repoPath}`);
  }

  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) {
    throw new Error(`Path adalah folder. Gunakan upload folder.`);
  }

  const content = fs.readFileSync(fullPath).toString("base64");
  const sha = await getFileSha(repoPath, token);

  const response = await axios.put(
    `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
    {
      message: `update: ${repoPath}`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    },
    { headers: getHeaders(token) }
  );

  return {
    ok: true,
    action: sha ? "updated" : "created",
    url: response.data.content.html_url,
    size: stats.size,
  };
}

export async function uploadFolder(folderPath, token, progressCallback) {
  const rootDir = process.cwd();
  const fullFolder = path.resolve(rootDir, folderPath);

  if (!fs.existsSync(fullFolder)) {
    throw new Error(`Folder tidak ditemukan: ${folderPath}`);
  }

  function getAllLocalFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(getAllLocalFiles(full));
      } else if (item.isFile()) {
        results.push(full);
      }
    }
    return results;
  }

  const allFiles = getAllLocalFiles(fullFolder);
  if (!allFiles.length) {
    throw new Error(`Folder ${folderPath} kosong.`);
  }

  let uploaded = 0;
  let failed = 0;

  for (const file of allFiles) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
    try {
      await uploadSingleFile(relPath, token);
      uploaded++;
      if (progressCallback) progressCallback(uploaded, allFiles.length, relPath);
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      failed++;
    }
  }

  return { total: allFiles.length, uploaded, failed };
}

export async function deleteSingleFile(repoPath, token) {
  const sha = await getFileSha(repoPath, token);
  if (!sha) {
    throw new Error(`File tidak ditemukan di GitHub: ${repoPath}`);
  }

  await axios.delete(
    `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`,
    {
      data: {
        message: `delete: ${repoPath}`,
        sha,
        branch: BRANCH,
      },
      headers: getHeaders(token),
    }
  );

  return { ok: true };
}

export async function deleteFolder(repoPath, token) {
  const files = await listFiles(repoPath, token);
  if (!files.length) {
    throw new Error(`Folder tidak ditemukan di GitHub: ${repoPath}`);
  }

  let deleted = 0;
  for (const item of files) {
    if (item.type === "file") {
      await deleteSingleFile(item.path, token);
      deleted++;
    } else if (item.type === "dir") {
      await deleteFolder(item.path, token);
    }
  }
  return { deleted };
}

export async function listFiles(dirPath = "", token) {
  try {
    const { data } = await axios.get(
      `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${dirPath}`,
      {
        params: { ref: BRANCH },
        headers: getHeaders(token),
      }
    );

    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
      url: item.html_url,
    }));
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
}

export async function getTree(token) {
  const { data } = await axios.get(
    `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`,
    { headers: getHeaders(token) }
  );
  return data.tree || [];
}
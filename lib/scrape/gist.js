import axios from "axios";

const GITHUB_API = "https://api.github.com/gists";

const EXT_MAP = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rb: "ruby",
  php: "php",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  html: "html",
  css: "css",
  json: "json",
  xml: "xml",
  sh: "bash",
  bash: "bash",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  sql: "sql",
  txt: "text",
};

function detectFilename(content, originalName) {
  if (originalName) {
    const ext = originalName.split(".").pop()?.toLowerCase();
    if (EXT_MAP[ext]) return originalName;
    return originalName;
  }

  const codeBlock = content.match(/^```(\w+)?\n/);
  if (codeBlock) {
    const lang = codeBlock[1]?.toLowerCase();
    const ext =
      Object.entries(EXT_MAP).find(([, v]) => v === lang)?.[0] || lang || "txt";
    return `snippet.${ext}`;
  }

  if (content.trimStart().startsWith("<")) return "snippet.html";
  if (content.includes("def ") || content.includes("import "))
    return "snippet.py";
  if (content.includes("function") || content.includes("=>"))
    return "snippet.js";

  return "snippet.txt";
}

function cleanContent(content) {
  return content
    .replace(/^```\w*\n?/, "")
    .replace(/```$/, "")
    .trim();
}

export async function uploadGist({
  content,
  filename,
  description = "",
  isPublic = false,
}) {
  const token = global.githubToken;
  if (!token) throw new Error("githubToken tidak ditemukan di config.");

  const cleanedContent = cleanContent(content);
  if (!cleanedContent.trim()) throw new Error("Konten kosong.");

  const res = await axios.post(
    GITHUB_API,
    {
      description: description || filename || "Uploaded via WolfBot",
      public: isPublic,
      files: {
        [filename]: { content: cleanedContent },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      timeout: 15000,
    },
  );

  return {
    id: res.data.id,
    url: res.data.html_url,
    rawUrl: Object.values(res.data.files)[0]?.raw_url,
    filename: Object.keys(res.data.files)[0],
    description: res.data.description,
    public: res.data.public,
    createdAt: res.data.created_at,
  };
}

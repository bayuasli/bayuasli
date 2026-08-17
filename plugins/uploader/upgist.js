import { uploadGist } from "#scrape/gist.js";

export default {
  name: "upgist",
  category: "uploader",
  command: ["upgist", "gist"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m) => {
    const quoted = m.quoted;

    let content = null;
    let filename = null;

    if (quoted?.isMedia) {
      const mime = quoted.msg?.mimetype || "";

      if (!/text|javascript|json|xml|html|plain|x-python|x-sh/i.test(mime)) {
        return m.reply("File yang direply harus berupa file teks.");
      }

      const buffer = await quoted.download();
      content = buffer.toString("utf-8");
      filename = quoted.msg?.fileName || null;
    } else if (quoted?.body) {
      content = quoted.body;
    } else if (m.text?.trim()) {
      content = m.text.trim();
    } else {
      return m.reply(
        "Reply teks, kode, atau file teks untuk diupload ke Gist.\n\n" +
          "Usage:\n" +
          "   upgist (reply pesan/file)\n" +
          "   upgist nama.js (reply pesan/file)\n" +
          "   gist (reply pesan/file)",
      );
    }

    const args = m.args || [];
    const customName = args[0]?.includes(".") ? args[0] : null;
    const description = customName ? args.slice(1).join(" ") : args.join(" ");

    filename = customName || filename || detectFilename(content);

    function detectFilename(text) {
      const codeBlock = text.match(/^```(\w+)?\n/);
      if (codeBlock) {
        const lang = codeBlock[1]?.toLowerCase();
        const extMap = {
          javascript: "js",
          typescript: "ts",
          python: "py",
          java: "java",
          cpp: "cpp",
          c: "c",
          csharp: "cs",
          go: "go",
          ruby: "rb",
          php: "php",
          rust: "rs",
          swift: "swift",
          kotlin: "kt",
          html: "html",
          css: "css",
          json: "json",
          xml: "xml",
          bash: "sh",
          yaml: "yaml",
          markdown: "md",
          sql: "sql",
          js: "js",
          ts: "ts",
          py: "py",
          sh: "sh",
        };
        const ext = extMap[lang] || lang || "txt";
        return `snippet.${ext}`;
      }

      if (text.trimStart().startsWith("<")) return "snippet.html";
      if (
        text.includes("export default") ||
        (text.includes("import ") && text.includes("from"))
      )
        return "snippet.js";
      if (text.includes("def ") && text.includes(":")) return "snippet.py";
      if (text.includes("function") || text.includes("=>")) return "snippet.js";
      if (text.startsWith("{") || text.startsWith("[")) return "snippet.json";

      return "snippet.txt";
    }

    const result = await uploadGist({
      content,
      filename,
      description: description || `Uploaded via WolfBot`,
      isPublic: false,
    });

    return m.reply(
      `Upload ke GitHub Gist berhasil.\n\n` +
        `File     : ${result.filename}\n` +
        `Gist URL : ${result.url}\n` +
        `Raw URL  : ${result.rawUrl}`,
    );
  },
};

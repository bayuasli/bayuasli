import fs from "fs";
import path from "path";
import { AIRich } from "#helper";

export default {
  name: "tree",
  category: "info",
  command: ["tree", "struktur", "files"],
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
    const dir = process.cwd();
    const exclude = [
      "node_modules",
      "sessions",
      ".npm",
      ".cache",
      ".git",
      "tmp",
      "logs",
    ];

    const entries = ["Root: " + dir, "Exclude: " + exclude.join(", "), ""];

    const traverse = (currentDir, prefix = "") => {
      try {
        const files = fs.readdirSync(currentDir);

        files.forEach((file, index) => {
          const full = path.join(currentDir, file);

          if (exclude.some((e) => full.includes(e))) return;

          const last = index === files.length - 1;
          const stats = fs.statSync(full);
          const isDir = stats.isDirectory();

          entries.push(prefix + (last ? "└── " : "├── ") + file);

          if (isDir) {
            traverse(full, prefix + (last ? "    " : "│   "));
          }
        });
      } catch {
        entries.push(prefix + "└── [Error: cannot read directory]");
      }
    };

    traverse(dir);

    const tree = entries.join("\n");

    try {
      await new AIRich(conn)
        .setTitle("📂 Struktur Files")
        .setFooter(`Total ${entries.length} baris`)
        .addCode("text", tree)
        .send(m.chat, { quoted: m });
    } catch (err) {
      console.error("[tree]", err.message);
      await conn.sendMessage(
        m.chat,
        {
          document: Buffer.from(tree, "utf-8"),
          mimetype: "text/plain",
          fileName: "struktur.txt",
          caption: "Struktur file",
        },
        { quoted: m },
      );
    }
  },
};

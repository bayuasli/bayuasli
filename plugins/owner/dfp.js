import fs from "fs";
import path from "path";

const pluginsDir = "./plugins";

export default {
  name: "dfp",
  category: "owner",
  command: ["dfp", "delpl"],
  alias: [],

  settings: {
    owner: true,
    protected: true
  },

  run: async (conn, m) => {
    const input = m.text?.trim();

    if (!input) {
      return m.reply(
        `Contoh penggunaan:\n` +
          `• ${m.prefix}${m.command} ai/cgpt\n` +
          `• ${m.prefix}${m.command} ai`,
      );
    }

    if (!input.includes("/")) {
      const categoryDir = path.join(pluginsDir, input);

      if (
        !fs.existsSync(categoryDir) ||
        !fs.statSync(categoryDir).isDirectory()
      ) {
        return m.reply(
          `Kategori *${input}* tidak ditemukan di folder plugins.`,
        );
      }

      const files = fs
        .readdirSync(categoryDir)
        .filter((f) => f.endsWith(".js"));

      if (!files.length) {
        return m.reply(`Tidak ada file plugin di kategori *${input}*.`);
      }

      const list = files.map((f, i) => `${i + 1}. ${f}`).join("\n");

      return m.reply(
        `Mungkin yang kamu maksud di *${input}*:\n\n` +
          `${list}\n\n` +
          `Gunakan: ${m.prefix}${m.command} ${input}/<nama_file>`,
      );
    }

    const filePath = path.join(
      pluginsDir,
      input.endsWith(".js") ? input : input + ".js",
    );

    if (!fs.existsSync(filePath)) {
      const parts = input.split("/");
      const category = parts[0];
      const categoryDir = path.join(pluginsDir, category);

      if (
        fs.existsSync(categoryDir) &&
        fs.statSync(categoryDir).isDirectory()
      ) {
        const files = fs
          .readdirSync(categoryDir)
          .filter((f) => f.endsWith(".js"));
        const list = files.map((f, i) => `${i + 1}. ${f}`).join("\n");

        return m.reply(
          `File *${path.basename(filePath)}* tidak ditemukan di *${category}*.\n\n` +
            `File yang tersedia:\n${list}`,
        );
      }

      return m.reply(`File *${filePath}* tidak ditemukan.`);
    }

    fs.unlinkSync(filePath);
    return m.reply(`Berhasil menghapus plugin: *${filePath}*`);
  },
};

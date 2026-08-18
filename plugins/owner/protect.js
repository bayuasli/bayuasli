import fs from "fs";
import path from "path";

function applyProtectToFile(fileCode) {
  const match = fileCode.match(/settings\s*:\s*\{([\s\S]*?)\}/);
  if (!match) return null;

  const currentSettings = match[1];
  if (/protected\s*:\s*true/.test(currentSettings)) {
    return fileCode;
  }

  let updatedSettings = "";
  if (/protected\s*:\s*false/.test(currentSettings)) {
    updatedSettings = currentSettings.replace(/protected\s*:\s*false/, "protected: true");
  } else {
    const trimmed = currentSettings.trimEnd();
    const hasTrailingComma = trimmed.endsWith(",");
    updatedSettings = `${trimmed}${hasTrailingComma ? "" : ","}\n    protected: true,\n  `;
  }

  return fileCode.replace(/settings\s*:\s*\{([\s\S]*?)\}/, `settings: {${updatedSettings}}`);
}

function applyUnprotectToFile(fileCode) {
  const match = fileCode.match(/settings\s*:\s*\{([\s\S]*?)\}/);
  if (!match) return null;

  const currentSettings = match[1];
  const updatedSettings = currentSettings
    .replace(/,?\s*protected\s*:\s*true,?/g, "")
    .replace(/protected\s*:\s*false,?/g, "");

  return fileCode.replace(/settings\s*:\s*\{([\s\S]*?)\}/, `settings: {${updatedSettings}}`);
}

export default {
  name: "protect",
  category: "owner",
  command: ["protect", "unprotect", "listprotect"],

  settings: {
    owner: true,
    protected: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const command = m.command;
    const input = (m.text || "").trim().replace(/\.js$/i, "").replace(/^\.\//, "").replace(/^plugins\//, "");

    if (command === "listprotect") {
      const list = [];
      for (const [key, plugin] of Object.entries(global.plugins || {})) {
        if (plugin.settings?.protected === true) {
          list.push(plugin.name || key);
        }
      }

      if (!list.length) {
        return m.reply("Belum ada plugin yang memiliki status *protected: true*.");
      }

      const text = list.map((item, i) => `${i + 1}. \`${item}\``).join("\n");
      return m.reply(`*DAFTAR PLUGIN DIPROTEKSI (OWNER ONLY)*\n\n${text}`);
    }

    if (command === "protect") {
      if (!input) {
        return m.reply("Ketik path plugin yang ingin diproteksi.\n\nContoh: `.protect owner/lock` atau `.protect main/menuv3`");
      }

      const pluginFilePath = path.join(process.cwd(), "plugins", `${input}.js`);

      if (!fs.existsSync(pluginFilePath)) {
        return m.reply(`Plugin tidak ditemukan di path: \`plugins/${input}.js\``);
      }

      try {
        const fileContent = fs.readFileSync(pluginFilePath, "utf-8");
        const updatedContent = applyProtectToFile(fileContent);

        if (!updatedContent) {
          return m.reply("Gagal menemukan struktur `settings: { ... }` pada file plugin tersebut.");
        }

        fs.writeFileSync(pluginFilePath, updatedContent, "utf-8");

        if (global.pluginLoader?.load) {
          await global.pluginLoader.load();
          global.plugins = global.pluginLoader.plugins;
        }

        return m.reply(`*PLUGIN PROTECTED*\n\nPlugin \`plugins/${input}.js\` berhasil diproteksi.\nPengaturan \`protected: true\` telah ditambahkan. Fitur ini sekarang hanya bisa diakses oleh Owner Asli.`);
      } catch (err) {
        return m.reply("Gagal memproteksi file plugin: " + err.message);
      }
    }

    if (command === "unprotect") {
      if (!input) {
        return m.reply("Ketik path plugin yang ingin dicabut proteksinya.\n\nContoh: `.unprotect owner/lock`");
      }

      const pluginFilePath = path.join(process.cwd(), "plugins", `${input}.js`);

      if (!fs.existsSync(pluginFilePath)) {
        return m.reply(`Plugin tidak ditemukan di path: \`plugins/${input}.js\``);
      }

      try {
        const fileContent = fs.readFileSync(pluginFilePath, "utf-8");
        const updatedContent = applyUnprotectToFile(fileContent);

        if (!updatedContent) {
          return m.reply("Gagal menemukan struktur `settings: { ... }` pada file plugin tersebut.");
        }

        fs.writeFileSync(pluginFilePath, updatedContent, "utf-8");

        if (global.pluginLoader?.load) {
          await global.pluginLoader.load();
          global.plugins = global.pluginLoader.plugins;
        }

        return m.reply(`*PROTEKSI DICABUT*\n\nProteksi pada plugin \`plugins/${input}.js\` berhasil dicabut.\nPengguna berstatus *trusted* kini dapat mengakses fitur ini jika berstatus owner: true.`);
      } catch (err) {
        return m.reply("Gagal mencabut proteksi plugin: " + err.message);
      }
    }
  },
};
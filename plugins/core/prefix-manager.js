import { loadPrefixConfig, savePrefixConfig } from "#lib/core/prefix.js";

export default {
  name: "prefix-manager",
  category: "core",
  command: ["prefix", "addprefix", "listprefix", "delprefix", "noprefix"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    const config = loadPrefixConfig();
    const command = m.command;
    const text = m.text?.trim() || "";

    if (command === "prefix") {
      if (text.toLowerCase() === "on" || text.toLowerCase() === "enable") {
        config.enabled = true;
        savePrefixConfig(config);
        return m.reply("*PREFIX ENABLED*\n\nGlobal member wajib menggunakan prefix untuk menjalankan perintah.");
      }

      if (text.toLowerCase() === "off" || text.toLowerCase() === "disable") {
        config.enabled = false;
        savePrefixConfig(config);
        return m.reply("*PREFIX DISABLED*\n\nSeluruh pengguna dapat menjalankan perintah tanpa prefix (mode non-prefix).");
      }

      const status = config.enabled ? "AKTIF (Wajib Prefix untuk Member)" : "NONAKTIF (Non-Prefix untuk Semua)";
      return m.reply(
        `*SETTINGS PREFIX SYSTEM*\n\n` +
          `• *Status Mode* : \`${status}\`\n` +
          `• *Owner Mode*  : \`Selalu Bebas (Bisa Prefix & Non-Prefix)\` \n\n` +
          `*Cara Penggunaan*:\n` +
          `• \`.prefix on\` : Mengaktifkan wajib prefix untuk member\n` +
          `• \`.prefix off\` : Mematikan prefix (mode non-prefix)\n` +
          `• \`.listprefix\` : Lihat daftar karakter prefix\n` +
          `• \`.addprefix <char>\` : Tambahkan karakter prefix baru\n` +
          `• \`.delprefix <char>\` : Hapus karakter prefix`
      );
    }

    if (command === "noprefix") {
      const mode = text.toLowerCase();
      if (mode === "off" || mode === "disable") {
        config.enabled = true;
        savePrefixConfig(config);
        return m.reply("Mode Non-Prefix dimatikan. Member wajib menggunakan prefix.");
      } else {
        config.enabled = false;
        savePrefixConfig(config);
        return m.reply("Mode Non-Prefix diaktifkan. Semua pengguna bebas tanpa prefix.");
      }
    }

    if (command === "listprefix") {
      const status = config.enabled ? "Aktif" : "Nonaktif (Mode Non-Prefix)";
      const list = config.prefixes.map((p) => `• \`${p}\``).join("\n");
      return m.reply(`*DAFTAR PREFIX BOT*\nStatus: \`${status}\`\n\n${list}`);
    }

    if (command === "addprefix") {
      if (!text) return m.reply("Contoh: `.addprefix !`");
      if (text.length !== 1) return m.reply("Prefix harus 1 karakter.");
      if (config.prefixes.includes(text)) {
        return m.reply(`Prefix \`${text}\` sudah terdaftar.`);
      }

      config.prefixes.push(text);
      savePrefixConfig(config);
      return m.reply(`Prefix \`${text}\` berhasil ditambahkan.`);
    }

    if (command === "delprefix") {
      if (!text) return m.reply("Contoh: `.delprefix !`");
      if (!config.prefixes.includes(text)) {
        return m.reply(`Prefix \`${text}\` tidak ditemukan.`);
      }
      if (config.prefixes.length <= 1) {
        return m.reply("Minimal harus ada 1 karakter prefix aktif.");
      }

      config.prefixes = config.prefixes.filter((p) => p !== text);
      savePrefixConfig(config);
      return m.reply(`Prefix \`${text}\` berhasil dihapus.`);
    }
  },
};
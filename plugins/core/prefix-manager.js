import { loadPrefixes, savePrefixes } from "#lib/core/prefix.js";

export default {
  name: "prefix-manager",
  category: "core",
  command: ["addprefix", "listprefix", "delprefix"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const prefixes = loadPrefixes();

    if (m.command === "listprefix") {
      return m.reply(
        `Prefix aktif saat ini:\n${prefixes.map((p) => `• ${p}`).join("\n")}`,
      );
    }

    if (m.command === "addprefix") {
      const newPrefix = (m.text || "").trim();
      if (!newPrefix) return m.reply("Contoh:\n.addprefix !");
      if (newPrefix.length !== 1) return m.reply("Prefix harus 1 karakter.");
      if (prefixes.includes(newPrefix))
        return m.reply(`Prefix "${newPrefix}" sudah terdaftar.`);

      prefixes.push(newPrefix);
      savePrefixes(prefixes);
      return m.reply(`Prefix "${newPrefix}" berhasil ditambahkan.`);
    }

    if (m.command === "delprefix") {
      const target = (m.text || "").trim();
      if (!target) return m.reply("Contoh:\n.delprefix !");
      if (!prefixes.includes(target))
        return m.reply(`Prefix "${target}" tidak ditemukan.`);
      if (prefixes.length <= 1)
        return m.reply(
          "Minimal harus ada 1 prefix aktif, tidak bisa dihapus semua.",
        );

      const updated = prefixes.filter((p) => p !== target);
      savePrefixes(updated);
      return m.reply(`Prefix "${target}" berhasil dihapus.`);
    }
  },
};

import fs from "fs";
import path from "path";

function extractFirstCommand(code) {
  const arrMatch = code.match(/command:\s*\[([^\]]+)\]/);
  if (arrMatch) {
    const firstStr = arrMatch[1].match(/['"`]([^'"`]+)['"`]/);
    if (firstStr) return firstStr[1];
  }
  const singleMatch = code.match(/command:\s*['"`]([^'"`]+)['"`]/);
  if (singleMatch) return singleMatch[1];
  return null;
}

async function reloadSingle(filePath) {
  if (typeof global.pluginLoader?.reloadFile === "function") {
    return await global.pluginLoader.reloadFile(filePath);
  }

  if (typeof global.pluginLoader?.reload === "function") {
    const result = await global.pluginLoader.reload();
    if (typeof global.reloadHandler === "function")
      await global.reloadHandler();
    return result;
  }

  return null;
}

export default {
  name: "sfp-reload",
  category: "core",
  command: ["sfp", "addpl", "reload", "rlp", "sp"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m, { quoted }) => {
    if (m.command === "reload" || m.command === "rlp") {
      if (!global.pluginLoader) {
        return m.reply("Plugin loader tidak tersedia.");
      }

      const result = await global.pluginLoader.reload();

      if (typeof global.reloadHandler === "function") {
        await global.reloadHandler();
      }

      let text =
        `Plugin berhasil di-reload.\n\n` +
        `Berhasil : ${result.success}\n` +
        `Gagal    : ${result.failed}`;

      if (result.failed > 0) {
        const list = result.errors
          .map((f) => `• ${f.replace(process.cwd(), "")}`)
          .join("\n");
        text += `\n\nGagal reload:\n${list}`;
      }

      return m.reply(text);
    }

    if (m.command === "sfp" || m.command === "addpl") {
      const code = quoted?.body || quoted?.msg?.text || quoted?.text || "";
      if (!code) return m.reply("Balas pesan berisi kode plugin.");

      let filename, subfolder;

      if (m.text?.trim()) {
        const args = m.text.trim().split(/\s+/);
        if (args.length < 2)
          return m.reply(
            `Format manual: ${m.prefix}${m.command} folder namaFile`,
          );
        subfolder = args[0];
        filename = args[1].endsWith(".js") ? args[1] : `${args[1]}.js`;
      } else {
        const nameMatch = code.match(/name:\s*['"`]([^'"`]+)['"`]/);
        const categoryMatch = code.match(/category:\s*['"`]([^'"`]+)['"`]/);

        if (nameMatch && categoryMatch) {
          filename = `${nameMatch[1]}.js`;
          subfolder = categoryMatch[1];
        } else {
          return m.reply(
            `Tidak ditemukan name/category di kode.\n` +
              `Gunakan manual: ${m.prefix}${m.command} folder namaFile`,
          );
        }
      }

      const fullDir = path.join("./plugins", subfolder);
      if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

      const filePath = path.join(fullDir, filename);
      const isUpdate = fs.existsSync(filePath);

      fs.writeFileSync(filePath, code);

      const sent = await conn.sendMessage(
        m.chat,
        {
          text:
            `Plugin ${isUpdate ? "diperbarui" : "disimpan"}.\n\n` +
            `Nama     : ${filename}\n` +
            `Kategori : ${subfolder}\n` +
            `Path     : ${filePath}\n\n` +
            `Sedang reload...`,
        },
        { quoted: m },
      );

      try {
        const result = await reloadSingle(filePath);
        const isAllReload = !global.pluginLoader?.reloadFile;

        let status;
        if (!result) {
          status = "Plugin loader tidak tersedia, reload manual diperlukan.";
        } else if (isAllReload) {
          status = `Semua plugin di-reload. Berhasil: ${result.success}, Gagal: ${result.failed}`;
        } else {
          status = `Plugin berhasil di-reload.`;
        }

        await conn.sendMessage(m.chat, {
          text:
            `Plugin ${isUpdate ? "diperbarui" : "disimpan"}.\n\n` +
            `Nama     : ${filename}\n` +
            `Kategori : ${subfolder}\n` +
            `Path     : ${filePath}\n\n` +
            `${status}`,
          edit: sent.key,
        });
      } catch (e) {
        await conn.sendMessage(m.chat, {
          text:
            `Plugin ${isUpdate ? "diperbarui" : "disimpan"}.\n\n` +
            `Nama     : ${filename}\n` +
            `Kategori : ${subfolder}\n` +
            `Path     : ${filePath}\n\n` +
            `Gagal reload: ${e.message}`,
          edit: sent.key,
        });
      }
    }
  },
};

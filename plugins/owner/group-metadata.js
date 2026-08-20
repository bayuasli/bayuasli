import fs from "fs";
import path from "path";
import { defaultLock } from "#lib/system/async-lock.js";

export default {
  name: "group-metadata",
  category: "owner",
  command: ["mtdt"],

  settings: {
    owner: true,
    private: false,
    group: true,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const subCommand = m.args[0]?.toLowerCase();
    const tmpDir = path.join(process.cwd(), "tmp");

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    if (subCommand === "check") {
      const fileName = `${m.chat}.json`;
      const filePath = path.join(tmpDir, fileName);

      const result = await defaultLock.withLock(fileName, async () => {
        try {
          await fs.promises.access(filePath);
          return "saved offline";
        } catch {
          return "clear";
        }
      });

      return m.reply(`*GROUP METADATA STATUS*\nStatus : \`${result}\``);
    }

    if (subCommand === "save") {
      const gm = conn.chats[m.chat] || await conn.groupMetadata(m.chat).catch(() => null);
      if (!gm) return m.reply("Gagal mendapatkan metadata grup.");

      const fileName = `${gm.id}.json`;
      const filePath = path.join(tmpDir, fileName);

      await defaultLock.withLock(fileName, async () => {
        await fs.promises.writeFile(filePath, JSON.stringify(gm, null, 2), "utf-8");
      });

      return m.reply(`Metadata grup berhasil disimpan offline di:\n\`${filePath}\``);
    }

    if (subCommand === "delete") {
      const fileName = `${m.chat}.json`;
      const filePath = path.join(tmpDir, fileName);

      const result = await defaultLock.withLock(fileName, async () => {
        try {
          await fs.promises.unlink(filePath);
          return "Metadata offline berhasil dihapus.";
        } catch (e) {
          if (e.code === "ENOENT") {
            return "File metadata offline tidak ditemukan.";
          }
          throw e;
        }
      });

      return m.reply(result);
    }

    if (subCommand === "savefresh") {
      const gm = await conn.groupMetadata(m.chat).catch(() => null);
      if (!gm) return m.reply("Gagal mendapatkan fresh metadata grup.");

      const fileName = `${gm.id}.json`;
      const filePath = path.join(tmpDir, fileName);

      await defaultLock.withLock(fileName, async () => {
        await fs.promises.writeFile(filePath, JSON.stringify(gm, null, 2), "utf-8");
      });

      return m.reply(`Fresh metadata grup berhasil disimpan di folder tmp:\n\`${fileName}\``);
    }

    return m.reply(
      `*GROUP METADATA MANAGER*\n\n` +
        `• \`.gm check\` : Cek status simpanan offline metadata\n` +
        `• \`.gm save\` : Simpan metadata grup saat ini ke file JSON\n` +
        `• \`.gm savefresh\` : Ambil ulang & simpan metadata fresh dari server\n` +
        `• \`.gm delete\` : Hapus file simpanan offline metadata`
    );
  },
};
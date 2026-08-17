import {
  getSticker,
  setSticker,
  lockSticker,
  deleteSticker,
  listStickers,
} from "#lib/core/stickercmd.js";

export default {
  name: "stickercmd-manage",
  category: "owner",
  command: ["setcmd", "lockcmd", "unlockcmd", "listcmd", "delcmd"],
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
    if (m.command === "setcmd") {
      if (!m.isQuoted || m.quoted.type !== "stickerMessage") {
        return m.reply(
          `Balas sticker dengan perintah *${m.prefix}${m.command}*`,
        );
      }
      if (!m.quoted.msg?.fileSha256) return m.reply("SHA256 Hash Missing");
      if (!m.text) {
        return m.reply(
          `Penggunaan:\n${m.prefix}${m.command} <teks>\n\nContoh:\n${m.prefix}${m.command} tes`,
        );
      }

      const hash = Buffer.from(m.quoted.msg.fileSha256).toString("base64");

      try {
        await setSticker(hash, {
          text: m.text,
          mentionedJid: m.mentions || [],
          creator: m.sender,
        });
        return m.reply("Success!");
      } catch (e) {
        return m.reply(e.message);
      }
    }

    if (m.command === "lockcmd" || m.command === "unlockcmd") {
      if (!m.isQuoted || m.quoted.type !== "stickerMessage")
        return m.reply("Reply sticker!");
      if (!m.quoted.msg?.fileSha256) return m.reply("SHA256 Hash Missing");

      const hash = Buffer.from(m.quoted.msg.fileSha256).toString("base64");

      try {
        await lockSticker(hash, m.command === "lockcmd");
        return m.reply("Done!");
      } catch (e) {
        return m.reply(e.message);
      }
    }

    if (m.command === "delcmd") {
      if (!m.isQuoted || m.quoted.type !== "stickerMessage")
        return m.reply("Reply sticker yang mau dihapus commandnya!");
      if (!m.quoted.msg?.fileSha256) return m.reply("Tidak ada hash");

      const hash = Buffer.from(m.quoted.msg.fileSha256).toString("base64");

      try {
        await deleteSticker(hash);
        return m.reply("Berhasil!");
      } catch (e) {
        return m.reply(e.message);
      }
    }

    if (m.command === "listcmd") {
      const stickers = await listStickers();

      if (stickers.length === 0)
        return m.reply("Belum ada sticker command tersimpan.");

      const lines = stickers.map(
        (s, i) =>
          `${i + 1}. ${s.locked ? `🔒 ` : ""}${s.hash.slice(0, 12)}... : ${s.text}`,
      );

      const allMentions = stickers.flatMap((s) => s.mentionedJid);

      return m.reply(`*DAFTAR STICKER CMD*\n\n${lines.join("\n")}`, {
        mentions: allMentions,
      });
    }
  },
};

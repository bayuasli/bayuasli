import { getSticker } from "#lib/core/stickercmd.js";

export default {
  name: "stickercmd",
  category: "core",
  command: [],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  on: async (conn, m) => {
    if (m.isBot) return;
    if (m.type !== "stickerMessage") return;
    if (!m.msg?.fileSha256) return;

    const hash = Buffer.from(m.msg.fileSha256).toString("base64");
    const entry = await getSticker(hash).catch(() => null);
    if (!entry) return;

    await m.reply(entry.text, { mentions: entry.mentionedJid });
  },

  run: async () => {},
};

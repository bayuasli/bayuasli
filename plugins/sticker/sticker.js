async function getAlbumMedia(
  conn,
  chat,
  albumId,
  expectedCount,
  timeoutMs = 15000,
) {
  const collected = new Map();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const chatMsgs = conn.messages?.get(chat) || [];

    for (const entry of chatMsgs) {
      const parentId =
        entry.message?.messageContextInfo?.messageAssociation?.parentMessageKey
          ?.id;
      if (parentId === albumId && entry.isMedia && !collected.has(entry.id)) {
        collected.set(entry.id, entry);
      }
    }

    if (collected.size >= expectedCount) break;
    await new Promise((r) => setTimeout(r, 700));
  }

  return [...collected.values()];
}

export default {
  name: "sticker",
  category: "sticker",
  command: ["s", "sticker", "stc", "stick", "stiker", "swm", "stickerwm"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { quoted }) => {
    const albumSource =
      m.type === "albumMessage"
        ? { id: m.key.id, msg: m.msg }
        : m.quoted?.type === "albumMessage"
          ? { id: m.quoted.id, msg: m.quoted.msg }
          : null;

    if (albumSource) {
      const expectedCount =
        (albumSource.msg.expectedImageCount || 0) +
        (albumSource.msg.expectedVideoCount || 0);
      const items = await getAlbumMedia(
        conn,
        m.chat,
        albumSource.id,
        expectedCount,
      );

      if (items.length === 0) {
        return m.reply(
          "Media album belum diterima semua atau sudah kadaluarsa dari histori bot.",
        );
      }

      if (items.length > 10) {
        return m.reply("Maksimal 10 gambar dalam satu album.");
      }

      let exif;
      if (m.text) {
        const [packname, author] = m.text.split(/[,|\-+&]/);
        exif = { packname: packname || "", packpublish: author || "" };
      } else {
        exif = { packname: global.stickpack, packpublish: global.stickauth };
      }

      for (const item of items) {
        try {
          const buffer = await item.download();
          await conn.sendSticker(m.chat, buffer, m, exif);
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.error("[sticker]", e);
        }
      }

      return;
    }

    if (quoted && /image|video|webp/.test(quoted.msg?.mimetype)) {
      const media = await quoted.download();

      if (quoted.msg?.seconds > 10) {
        return m.reply(
          "Video lebih dari 10 detik tidak bisa dijadikan sticker.",
        );
      }

      let exif;
      if (m.text) {
        const [packname, author] = m.text.split(/[,|\-+&]/);
        exif = { packname: packname || "", packpublish: author || "" };
      } else {
        exif = { packname: global.stickpack, packpublish: global.stickauth };
      }

      await conn.sendSticker(m.chat, media, m, exif);
      return;
    }

    if (m.mentions && m.mentions.length > 0) {
      for (const id of m.mentions) {
        try {
          const pp = await conn
            .profilePictureUrl(id, "image")
            .catch(() => null);
          if (pp) {
            const buffer = await conn.getFile(pp);
            await conn.sendSticker(m.chat, buffer.data, m);
          }
        } catch (err) {
          console.error("Gagal ambil PP untuk " + id + ":", err);
        }
      }
      return;
    }

    m.reply(
      "Reply gambar/video atau kirim album gambar untuk dijadikan sticker.\n\nUntuk custom packname: .s packname|author",
    );
  },
};

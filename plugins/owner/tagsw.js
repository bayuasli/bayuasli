import { proto, generateWAMessage, STORIES_JID } from "baileys";

async function fetchParticipants(conn, ...jids) {
  let results = [];
  for (const jid of jids) {
    const { participants } = await conn.groupMetadata(jid);
    results = results.concat(participants.map((p) => p.id));
  }
  return results;
}

async function mentionStatus(conn, jids, content) {
  const storiesJid = STORIES_JID || "status@broadcast";

  const msg = await generateWAMessage(storiesJid, content, {
    upload: conn.waUploadToServer,
  });

  let statusJidList = [];
  for (const targetJid of jids) {
    if (targetJid.endsWith("@g.us")) {
      statusJidList.push(...(await fetchParticipants(conn, targetJid)));
    } else {
      statusJidList.push(targetJid);
    }
  }
  statusJidList = [...new Set(statusJidList)];

  await conn.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id,
    statusJidList,
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: jids.map((jid) => ({
              tag: "to",
              attrs: { jid },
              content: undefined,
            })),
          },
        ],
      },
    ],
  });

  for (const jid of jids) {
    const type = jid.endsWith("@g.us")
      ? "groupStatusMentionMessage"
      : "statusMentionMessage";
    await conn.relayMessage(
      jid,
      {
        [type]: {
          message: {
            protocolMessage: { key: msg.key, type: 25 },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "true" },
            content: undefined,
          },
        ],
      },
    );
  }

  return msg;
}

export default {
  name: "tagsw",
  category: "owner",
  command: ["tagsw"],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { quoted }) => {
    if (!proto.Message.ProtocolMessage.Type.STATUS_MENTION_MESSAGE) {
      return m.reply(
        "STATUS_MENTION_MESSAGE tidak ditemukan. WAProto kemungkinan outdated.",
      );
    }

    const hasMedia = m.isQuoted && quoted.isMedia;
    let content;

    if (hasMedia) {
      const buffer = await quoted.download();
      const mime = (quoted.msg || quoted).mimetype || "";
      content = /video/.test(mime)
        ? { video: buffer, caption: m.text || "" }
        : { image: buffer, caption: m.text || "" };
    } else {
      if (!m.text)
        return m.reply(
          "Kasih teks atau reply media dulu.\n\nContoh: .tagsw halo semua",
        );
      content = { text: m.text, backgroundColor: "#7ACAA7" };
    }

    try {
      await mentionStatus(conn, [m.chat], content);
      return m.reply("Status berhasil dikirim dan semua member ter-tag.");
    } catch (err) {
      console.error("[tagsw]", err);
      return m.reply("Gagal kirim tag status: " + err.message);
    }
  },
};

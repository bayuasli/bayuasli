import {
  areJidsSameUser,
  delay,
  downloadMediaMessage,
  extractMessageContent,
  jidNormalizedUser,
  getDevice,
  generateMessageIDV2,
  generateWAMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "baileys";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";
import path from "path";
import pino from "pino";
import Func from "#lib/system/function.js";
import { handleReply } from "#lib/system/reply-type.js";
import { ContactStore } from "#store/contact-store.js";

const messId = generateMessageIDV2().slice(0, 4);

function getMessageById(conn, chat, id) {
  const msgs = conn.messages?.get(chat) || [];
  return msgs.find((m) => m.id === id) || null;
}

async function getThumbnail() {
  try {
    const targetDir = global.thumbnailDir || "lib/media";
    const dir = path.join(process.cwd(), targetDir);
    if (fs.existsSync(dir)) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
      if (files.length > 0) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        return fs.readFileSync(path.join(dir, randomFile));
      }
    }
  } catch (err) {
    console.error("Gagal memuat thumbnail random:", err.message);
  }
  return await Func.getBuffer(global.thumbnailUrl);
}

export function Client(conn) {
  conn.sock = conn;

  const client = Object.defineProperties(conn, {
    getJid: {
      value(sender) {
        if (!sender || typeof sender !== "string") return sender || "";
        sender = jidNormalizedUser(sender);
        conn.isLid ??= new Map();
        if (conn.isLid.has(sender)) return conn.isLid.get(sender);
        if (!sender.endsWith("@lid")) return sender;
        for (const chat of Object.values(conn.chats || {})) {
          if (!chat?.participants) continue;
          const user = chat.participants.find(
            (p) => p?.lid === sender || p?.id === sender,
          );
          if (user) {
            const jid = user?.phoneNumber || user?.jid || user?.id;
            if (jid) {
              const normalized = jidNormalizedUser(jid);
              conn.isLid.set(sender, normalized);
              return normalized;
            }
          }
        }
        return sender;
      },
      enumerable: true,
      configurable: true,
    },

    sendButton: {
      async value(jid, content = {}, options = {}) {
        let header = {};
        let mime = null;

        if (content.image) mime = "image";
        else if (content.video) mime = "video";
        else if (content.document) mime = "document";

        if (mime) {
          const media = await prepareWAMessageMedia(
            { [mime]: content[mime] },
            { upload: conn.waUploadToServer },
          );
          header = {
            hasMediaAttachment: true,
            [`${mime}Message`]: media[`${mime}Message`],
          };
        }

        const msg = generateWAMessageFromContent(
          jid,
          {
            interactiveMessage: {
              header: { title: content.title || "", ...header },
              body: {
                text: content.body || content.text || content.caption || "",
              },
              footer: { text: content.footer || "" },
              nativeFlowMessage: {
                buttons: content.buttons || [],
                ...content,
              },
              ...content,
            },
          },
          { userJid: conn.user?.id, ...options },
        );

        await conn.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
          additionalNodes: [
            {
              tag: "biz",
              attrs: {},
              content: [
                {
                  tag: "interactive",
                  attrs: { type: "native_flow", v: "1" },
                  content: [
                    { tag: "native_flow", attrs: { v: "9", name: "mixed" } },
                  ],
                },
              ],
            },
          ],
        });

        return msg;
      },
    },

    getName: {
      value(jid) {
        if (!jid) return "Unknown";
        jid = conn.getJid(jid);

        if (areJidsSameUser(jid, conn.user?.id)) {
          return conn.user?.name || global.title || global.namebot || "Z3PHWOLF";
        }

        if (jid.endsWith("@g.us")) {
          return conn.chats[jid]?.subject || "Grup";
        }

        const contact = ContactStore.getContact(jid);
        if (contact?.name) return contact.name;

        for (const msgs of conn.messages.values()) {
          const msg = msgs.find((m) => m.sender === jid);
          if (msg?.pushname) return msg.pushname;
        }

        return jid.split("@")[0];
      },
    },

    parseMention: {
      value(text) {
        return (
          [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
            (v) => v[1] + "@s.whatsapp.net",
          ) || []
        );
      },
    },

    getFile: {
      async value(PATH, saveToFile = false) {
        let filename;
        const data = Buffer.isBuffer(PATH)
          ? PATH
          : PATH instanceof ArrayBuffer
            ? Buffer.from(PATH)
            : /^data:.*?\/.*?;base64,/i.test(PATH)
              ? Buffer.from(PATH.split(",")[1], "base64")
              : /^https?:\/\//.test(PATH)
                ? await Func.getBuffer(PATH)
                : fs.existsSync(PATH)
                  ? ((filename = PATH), fs.readFileSync(PATH))
                  : typeof PATH === "string"
                    ? Buffer.from(PATH)
                    : Buffer.alloc(0);

        if (!Buffer.isBuffer(data))
          throw new TypeError("Result is not a buffer");
        const type = (await fileTypeFromBuffer(data)) || {
          mime: "application/octet-stream",
          ext: "bin",
        };

        if (data && saveToFile && !filename) {
          filename = path.join(process.cwd(), `tmp/${Date.now()}.${type.ext}`);
          await fs.promises.writeFile(filename, data);
        }

        return {
          filename,
          ...type,
          data,
          deleteFile() {
            return filename && fs.promises.unlink(filename);
          },
        };
      },
      enumerable: true,
    },

    downloadMediaMessage: {
      async value(message, filename) {
        const rawMessage = message.key && message.message ? message : { key: message.key, message: message.message || message };
        const media = await downloadMediaMessage(
          rawMessage,
          "buffer",
          {},
          {
            logger: pino({
              timestamp: () => `,"time":"${new Date().toJSON()}"`,
              level: "fatal",
            }).child({ class: "hisoka" }),
            reuploadRequest: conn.updateMediaMessage,
          },
        );

        if (filename) {
          const mime = await fileTypeFromBuffer(media);
          const filePath = path.join(process.cwd(), `${filename}.${mime.ext}`);
          await fs.promises.writeFile(filePath, media);
          return filePath;
        }

        return media;
      },
      enumerable: true,
    },

    sendAlbumMessage: {
      async value(jid, medias, options = {}) {
        const userJid = conn.user?.id || conn.authState?.creds?.me?.id;
        if (!Array.isArray(medias) || medias.length < 2)
          throw new Error("Album minimal berisi 2 media.");

        const validMedias = medias.filter(
          (media) => media.image || media.video,
        );
        if (validMedias.length < 2)
          throw new Error(
            "Album minimal berisi 2 media (image/video) yang valid.",
          );

        const time = options.delay || 5000;
        if (options.quoted)
          options.ephemeralExpiration = options.quoted.expiration || 0;
        delete options.delay;

        const album = await generateWAMessageFromContent(
          jid,
          {
            albumMessage: {
              expectedImageCount: validMedias.filter((m) => m.image).length,
              expectedVideoCount: validMedias.filter((m) => m.video).length,
              ...options,
            },
          },
          { userJid, ...options },
        );

        await conn.relayMessage(jid, album.message, {
          messageId: album.key.id,
        });

        for (const media of validMedias) {
          let msg;
          if (media.image) {
            msg = await generateWAMessage(
              jid,
              { image: media.image, ...media, ...options },
              {
                userJid,
                upload: async (r, o) => conn.waUploadToServer(r, o),
                ...options,
              },
            );
          } else if (media.video) {
            msg = await generateWAMessage(
              jid,
              { video: media.video, ...media, ...options },
              {
                userJid,
                upload: async (r, o) => conn.waUploadToServer(r, o),
                ...options,
              },
            );
          }

          msg.message.messageContextInfo = {
            messageAssociation: {
              associationType: 1,
              parentMessageKey: album.key,
            },
          };

          await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
          await delay(time);
        }
        return album;
      },
    },

    sendSticker: {
      async value(jid, filePath, m, options = {}) {
        const { data, mime } = await conn.getFile(filePath);
        if (data.length === 0) throw new TypeError("File tidak ditemukan");
        const exif = {
          packName: options.packname || global.stickpack,
          packPublish: options.packpublish || global.stickauth,
        };
        const sticker = await (
          await import("#lib/exif.js")
        ).writeExif({ mimetype: mime, data }, exif);
        return conn.sendMessage(
          jid,
          { sticker },
          { quoted: m, ephemeralExpiration: m?.expiration },
        );
      },
    },

    sendGroupV4Invite: {
      async value(
        groupJid,
        participant,
        inviteCode,
        inviteExpiration,
        groupName,
        caption,
        jpegThumbnail,
        options = {},
      ) {
        const msg = generateWAMessageFromContent(
          participant,
          {
            groupInviteMessage: {
              inviteCode,
              inviteExpiration:
                parseInt(inviteExpiration) || Date.now() + 3 * 86400000,
              groupJid,
              groupName,
              jpegThumbnail,
              caption,
            },
          },
          { userJid: conn.user.id, ...options },
        );

        await conn.relayMessage(participant, msg.message, {
          messageId: msg.key.id,
        });
        return msg;
      },
      enumerable: true,
    },

    sendMedia: {
      async value(jid, PATH, options = {}) {
        const { data, mime, filename } = await conn.getFile(PATH);
        const type = mime.split("/")[0];
        let messageContent = {};

        if (type === "image") {
          messageContent = { image: data, ...options };
        } else if (type === "video") {
          messageContent = { video: data, ...options };
        } else if (type === "audio") {
          messageContent = { audio: data, mimetype: mime, ...options };
        } else {
          messageContent = {
            document: data,
            mimetype: mime,
            fileName: options.fileName || filename || "file",
            ...options,
          };
        }

        return await conn.sendMessage(jid, messageContent, {
          quoted: options.quoted,
          ephemeralExpiration: options.ephemeralExpiration,
        });
      },
      enumerable: true,
    },

    clearChat: {
      async value(jid, lastMsg) {
        if (!lastMsg) {
          const msgs = conn.messages?.get(jid) || [];
          lastMsg = msgs[msgs.length - 1];
        }
        const id = lastMsg?.id || "ATWYHDNNWU81732J";
        const fromMe = lastMsg?.fromMe ?? true;
        const timestamp = lastMsg?.timestamp || Math.floor(Date.now() / 1000);

        return await conn.chatModify(
          {
            clear: {
              messages: [
                {
                  id,
                  fromMe,
                  timestamp: timestamp.toString()
                }
              ]
            }
          },
          jid
        );
      },
      enumerable: true,
    },

    deleteChat: {
      async value(jid, lastMsg) {
        if (!lastMsg) {
          const msgs = conn.messages?.get(jid) || [];
          lastMsg = msgs[msgs.length - 1];
        }
        if (!lastMsg) {
          throw new Error("Penghapusan chat membutuhkan objek referensi pesan terakhir (lastMsg).");
        }
        return await conn.chatModify(
          {
            delete: true,
            lastMessages: [
              {
                key: lastMsg.key,
                messageTimestamp: lastMsg.timestamp
              }
            ]
          },
          jid
        );
      },
      enumerable: true,
    },
  });
  return client;
}

export default async function serialize(conn, msg) {
  if (!msg) return;
  const m = {};
  m.message = parseMessage(msg.message);

  if (msg.key) {
    m.key = msg.key;
    m.id = m.key.id;
    m.device = getDevice(m.id);
    m.isBot = m.id.startsWith(messId);
    m.isBaileys = (m.id?.startsWith("BAE5") && m.id?.length === 16) || false;
    m.chat = conn.getJid(m.key.remoteJid);
    m.isGroup = m.chat.endsWith("@g.us");
    m.isPrivate =
      !m.isGroup &&
      !m.chat.endsWith("@newsletter") &&
      m.chat !== "status@broadcast";
    m.isChannel = m.chat.endsWith("@newsletter");
    m.isStatus = m.chat === "status@broadcast";
    m.isBroadcast = m.chat.endsWith("@broadcast") && !m.isStatus;
    m.sender = conn.getJid(
      m.key.participantAlt ||
        m.key.participantPn ||
        m.key.participant ||
        m.chat,
    );
    m.fromMe =
      m.key.fromMe ||
      areJidsSameUser(m.sender, jidNormalizedUser(conn.user?.id));
    m.senderNumber = m.sender?.split("@")[0] || "";
    m.timestamp =
      typeof msg.messageTimestamp === "object"
        ? (msg.messageTimestamp?.toNumber?.() ?? Math.floor(Date.now() / 1000))
        : (msg.messageTimestamp ?? Math.floor(Date.now() / 1000));
    m.isOwner = global.ownerNumber?.includes(m.senderNumber) || m.fromMe;
  }

  const selfName = conn.user?.name || global.title || global.namebot || "Z3PHWOLF";

  if (m.sender && msg.pushName) {
    ContactStore.upsertAndGetContact({
      primaryId: m.sender,
      name: msg.pushName
    });
  }

  const senderContact = m.sender ? ContactStore.getContact(m.sender) : null;
  const resolvedName = msg.pushName || senderContact?.name || (m.fromMe ? selfName : null) || conn.getName(m.sender);

  m.pushname = msg.pushName || senderContact?.name || (m.fromMe ? selfName : null);
  m.name = resolvedName;
  m.senderName = resolvedName;
  m.jid = m.sender;
  m.pn = m.senderNumber;
  m.lid = msg.key?.participant?.endsWith("@lid") ? msg.key.participant : (msg.key?.remoteJid?.endsWith("@lid") ? msg.key.remoteJid : (senderContact?.secondaryId || null));
  m.chatName = conn.getName(m.chat);
  m.timesTamp = msg.messageTimestamp;

  if (m.message) {
    m.type = getContentType(m.message);
    m.msg = parseMessage(m.message[m.type]) || m.message[m.type];
    m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath;
    const mention = [
      ...(m.msg?.contextInfo?.mentionedJid || []),
      ...(m.msg?.contextInfo?.groupMentions?.map((v) => v.groupJid) || []),
    ];
    m.mentions = mention.map((jid) => conn.getJid(jid));
    m.body =
      m.msg?.text ||
      m.msg?.conversation ||
      m.msg?.caption ||
      m.message?.conversation ||
      m.msg?.selectedButtonId ||
      m.msg?.singleSelectReply?.selectedRowId ||
      m.msg?.selectedId ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      m.msg?.name ||
      "";

    m.prefix = "";
    m.args = m.body.trim().split(/ +/).slice(1);
    m.text = m.args.join(" ");
    m.command = m.body.trim().split(/ +/).shift() || "";
    m.cmd = m.command;

    m.expiration = m.msg?.contextInfo?.expiration || 0;
    if (m.isMedia) m.download = () => conn.downloadMediaMessage(m);
    m.isQuoted = false;

    if (m.msg?.contextInfo?.quotedMessage) {
      m.isQuoted = true;
      m.quoted = {};
      m.quoted.message = parseMessage(m.msg?.contextInfo?.quotedMessage);
      if (m.quoted.message) {
        m.quoted.type =
          getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0];
        m.quoted.msg =
          parseMessage(m.quoted.message[m.quoted.type]) ||
          m.quoted.message[m.quoted.type];
        m.quoted.isMedia =
          !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath;
        m.quoted.key = {
          remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
          participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
          fromMe: areJidsSameUser(
            conn.getJid(m.msg?.contextInfo?.participant),
            jidNormalizedUser(conn.user?.id),
          ),
          id: m.msg?.contextInfo?.stanzaId,
        };
        m.quoted.id = m.msg?.contextInfo?.stanzaId;
        m.quoted.device = getDevice(m.quoted.id);
        m.quoted.chat = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid)
          ? m.quoted.key.participant
          : m.quoted.key.remoteJid;
        m.quoted.chatName = conn.getName(m.quoted.chat);
        m.quoted.fromMe = m.quoted.key.fromMe;
        m.quoted.sender = conn.getJid(
          m.msg?.contextInfo?.participant || m.quoted.chat,
        );
        m.quoted.senderNumber = m.quoted.sender?.split("@")[0] || "";

        const quotedContact = m.quoted.sender ? ContactStore.getContact(m.quoted.sender) : null;
        const resolvedQuotedName = quotedContact?.name || (m.quoted.fromMe ? selfName : null) || conn.getName(m.quoted.sender);

        m.quoted.pushname = quotedContact?.name || (m.quoted.fromMe ? selfName : null);
        m.quoted.name = resolvedQuotedName;
        m.quoted.senderName = resolvedQuotedName;
        m.quoted.jid = m.quoted.sender;
        m.quoted.pn = m.quoted.senderNumber;
        m.quoted.lid = m.msg?.contextInfo?.participant?.endsWith("@lid") ? m.msg.contextInfo.participant : (quotedContact?.secondaryId || null);
        m.quoted.isGroup = m.quoted.chat.endsWith("@g.us");
        m.quoted.isPrivate = !m.quoted.isGroup;
        m.quoted.isOwner = global.ownerNumber?.includes(m.quoted.senderNumber) || m.quoted.fromMe;

        const mentionQuoted = [
          ...(m.quoted.msg?.contextInfo?.mentionedJid || []),
          ...(m.quoted.msg?.contextInfo?.groupMentions?.map(
            (v) => v.groupJid,
          ) || []),
        ];
        m.quoted.mentions = mentionQuoted.map((jid) => conn.getJid(jid));
        m.quoted.body =
          m.quoted.msg?.text ||
          m.quoted.msg?.caption ||
          m.quoted?.message?.conversation ||
          m.quoted.msg?.selectedButtonId ||
          m.quoted.msg?.singleSelectReply?.selectedRowId ||
          m.quoted.msg?.selectedId ||
          m.quoted.msg?.contentText ||
          m.quoted.msg?.selectedDisplayText ||
          m.quoted.msg?.title ||
          m.quoted?.msg?.name ||
          "";
        m.quoted.args = m.quoted.body.trim().split(/ +/).slice(1);
        m.quoted.text = m.quoted.args.join(" ");
        if (m.quoted.isMedia) {
          m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
        }

        m.quoted.delete = async () => {
          return await conn.sendMessage(m.chat, { delete: m.quoted.key });
        };
        m.quoted.del = m.quoted.delete;

        m.quoted.reply = async (text, options = {}) => {
          return await conn.sendMessage(
            m.chat,
            typeof text === "string" ? { text, ...options } : { ...text, ...options },
            { quoted: { key: m.quoted.key, message: m.quoted.message }, ...options }
          );
        };

        m.quoted.react = async (emoji) => {
          return await conn.sendMessage(m.chat, {
            react: { text: emoji, key: m.quoted.key }
          });
        };

        m.quoted.edit = async (newText) => {
          if (!m.quoted.fromMe) {
            throw new Error("Hanya dapat mengedit pesan quoted milik bot sendiri.");
          }
          return await conn.sendMessage(m.chat, { text: newText, edit: m.quoted.key });
        };

        m.q = m.quoted;
      }
    } else {
      m.q = null;
    }
  }

  m.getQuotedMessage = async () => {
    if (!m.quoted?.id) return null;
    const cached = getMessageById(conn, m.chat, m.quoted.id);
    if (cached) return cached;
    try {
      const msg = await conn.loadMessage?.(m.chat, m.quoted.id);
      if (msg) return await serialize(conn, msg);
    } catch {}
    return null;
  };

  m.reply = async (text, options = {}) => {
    try {
      return await handleReply(conn, m, text, options);
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      Promise.race([
        conn.sendPresenceUpdate("unavailable", m.chat),
        new Promise((r) => setTimeout(r, 3000)),
      ]).catch(() => {});
    }
  };

  m.react = async (emoji) => {
    try {
      return await conn.sendMessage(m.chat, {
        react: { text: emoji, key: m.key }
      });
    } catch (err) {
      console.error("React error:", err.message);
    }
  };

  m.delete = async () => {
    try {
      return await conn.sendMessage(m.chat, { delete: m.key });
    } catch (err) {
      console.error("Delete error:", err.message);
    }
  };

  m.edit = async (newText) => {
    try {
      if (!m.fromMe) {
        throw new Error("Hanya dapat mengedit pesan milik bot sendiri.");
      }
      return await conn.sendMessage(m.chat, { text: newText, edit: m.key });
    } catch (err) {
      console.error("Edit error:", err.message);
    }
  };

  return m;
}

function parseMessage(content) {
  content = extractMessageContent(content);
  if (content && content.viewOnceMessageV2Extension)
    content = content.viewOnceMessageV2Extension.message;
  if (
    content &&
    content.protocolMessage &&
    content.protocolMessage.type === 14
  ) {
    const type = getContentType(content.protocolMessage);
    content = content.protocolMessage[type];
  }
  if (content && content.message) {
    const type = getContentType(content.message);
    content = content.message[type];
  }
  return content;
}

const getContentType = (content) => {
  if (content) {
    const keys = Object.keys(content);
    const key = keys.find(
      (k) =>
        (k === "conversation" ||
          k.endsWith("Message") ||
          k.includes("V2") ||
          k.includes("V3")) &&
        k !== "senderKeyDistributionMessage",
    );
    return key;
  }
};
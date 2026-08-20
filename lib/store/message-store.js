import fs from "fs";
import path from "path";
import { encodeBinaryNode, proto } from "baileys";
import { db, contactStore } from "./contact-store.js";

const dbPath = path.join(process.cwd(), "lib/database/store.db");

let saveTimeout = null;
function saveDb() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    try {
      const data = db.export();
      fs.promises.writeFile(dbPath, Buffer.from(data)).catch(() => {});
    } catch {}
  }, 5000);
}

db.exec(`
CREATE TABLE IF NOT EXISTS message_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT,
  chat_id INTEGER REFERENCES contacts (id),
  contact_id INTEGER REFERENCES contacts (id),
  content_id INTEGER REFERENCES message_contents (id),
  text TEXT,
  timestamp INTEGER,
  buffer BLOB,
  node BLOB
);

CREATE INDEX IF NOT EXISTS idx_msg_msg_id ON messages (message_id);
CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages (chat_id);
`);

const defaultContents = [
  "extendedTextMessage", "conversation", "stickerMessage", "imageMessage",
  "reactionMessage", "protocolMessage", "videoMessage", "audioMessage",
  "pinInChatMessage", "interactiveResponseMessage", "interactiveMessage",
  "albumMessage", "groupStatusMentionMessage", "documentMessage",
  "buttonsMessage", "groupInviteMessage", "buttonsResponseMessage",
  "botInvokeMessage", "stickerPackMessage", "pollResultSnapshotMessage",
  "lottieStickerMessage", "templateButtonReplyMessage", "ptvMessage",
  "keepInChatMessage", "groupStatusMessageV2", "contactMessage",
  "pollUpdateMessage", "associatedChildMessage", "productMessage",
  "messageStubType", "editedMessage", "eventMessage",
  "encEventResponseMessage", "requestPaymentMessage", "orderMessage",
  "pollCreationMessageV3", "locationMessage", "requestPhoneNumberMessage",
  "contactsArrayMessage", "listMessage", "listResponseMessage",
  "templateMessage", "liveLocationMessage", "pollCreationMessage",
  "newsletterAdminInviteMessage", "pollCreationMessageV5", "viewOnceMessage",
  "paymentInviteMessage", "scheduledCallCreationMessage", "pollCreationMessageV2",
  "newsletterFollowerInviteMessageV2", "declinePaymentRequestMessage",
  "secretEncryptedMessage", "richResponseMessage", "botForwardedMessage",
  "placeholderMessage", "commentMessage", "bcallMessage",
  "pollCreationMessageV4", "encCommentMessage", "encReactionMessage",
  "questionMessage", "statusQuestionAnswerMessage", "statusStickerInteractionMessage",
  "sendPaymentMessage", "statusMentionMessage"
];

for (const content of defaultContents) {
  try {
    const stmt = db.prepare("INSERT OR IGNORE INTO message_contents (content) VALUES (:content)");
    stmt.run({ ":content": content });
    stmt.free();
  } catch {}
}

function queryGet(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryRun(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDb();
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function sexyTrim(str, len = 15) {
  if (!str) return "unknown";
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + "...";
}

function serverMapping(primaryServer) {
  if (primaryServer === "g.us") return "👥 Group Chat";
  if (primaryServer === "lid") return "👤 Private Chat";
  if (primaryServer === "newsletter") return "📰 Newsletter";
  if (primaryServer === "broadcast") return "📢 Broadcast";
  return primaryServer || "👤 Private Chat";
}

function getContentId(contentTypeName) {
  if (!contentTypeName) contentTypeName = "conversation";
  let row = queryGet("SELECT id FROM message_contents WHERE content = :content", { ":content": contentTypeName });
  if (!row) {
    queryRun("INSERT OR IGNORE INTO message_contents (content) VALUES (:content)", { ":content": contentTypeName });
    row = queryGet("SELECT id FROM message_contents WHERE content = :content", { ":content": contentTypeName });
  }
  return row ? row.id : 1;
}

export function getContentById(id) {
  if (!id) return undefined;
  return queryGet("SELECT * FROM message_contents WHERE id = :id", { ":id": id });
}

class MessageStore {
  getChatStats(id) {
    try {
      if (!id) return { error: "ID chat tidak valid." };
      const chat = typeof id === "number" ? contactStore.getContactById(id) : contactStore.getContact(id);
      if (!chat) return { error: `Tidak ditemukan chat dengan ID ${id}` };

      const rows = queryAll(
        `SELECT count(*) as total, mc.content, sum(length(m.buffer)) as totalBytes
         FROM messages m
         LEFT JOIN message_contents mc ON m.content_id = mc.id
         WHERE m.chat_id = :chatId
         GROUP BY m.content_id
         ORDER BY total DESC`,
        { ":chatId": chat.id }
      );

      if (!rows || !rows.length || !rows[0].total) {
        return { error: "Belum ada riwayat statistik pesan." };
      }

      let totalMessages = 0;
      let totalBytes = 0;

      const details = rows.map((v) => {
        totalMessages += v.total;
        totalBytes += v.totalBytes || 0;
        const avg = Math.floor((v.totalBytes || 0) / (v.total || 1));
        return `- ${v.total} ${v.content?.replace("Message", "")} (${formatBytes(v.totalBytes)}) | avg ${formatBytes(avg)}`;
      }).join("\n");

      const resultText = `*CHAT STATS*\n\nNama : ${chat.name || "Unknown"}\nJID  : ${chat.primaryId}\n\nTotal Pesan : ${totalMessages} (${formatBytes(totalBytes)})\n\n${details}`;
      return { data: resultText };
    } catch (e) {
      return { error: `Terjadi kesalahan: ${e.message}` };
    }
  }

  getChatStatGlobal() {
    const rows = queryAll(
      `SELECT m.chat_id as contactId, c.name, c.primary_id as primaryId, c.primary_server as primaryServer,
              count(*) as totalMessages, sum(length(m.buffer)) as totalBytes
       FROM messages m
       LEFT JOIN contacts c ON m.chat_id = c.id
       GROUP BY m.chat_id
       ORDER BY lower(c.primary_server), totalMessages DESC`
    );

    if (!rows.length) throw new Error("Belum ada data riwayat statistik global.");

    let totalMessages = 0;
    let totalBytes = 0;
    const groupMap = new Map();

    for (const v of rows) {
      const serverKey = v.primaryServer || "s.whatsapp.net";
      if (!groupMap.has(serverKey)) groupMap.set(serverKey, []);
      groupMap.get(serverKey).push(v);
    }

    const textParts = [];

    for (const [server, items] of groupMap.entries()) {
      const title = `*${serverMapping(server)}*`;
      const itemLines = items.map((v) => {
        totalMessages += v.totalMessages || 0;
        totalBytes += v.totalBytes || 0;
        const avg = Math.floor((v.totalBytes || 0) / (v.totalMessages || 1));
        return `- ${sexyTrim(v.name || "Unknown", 15)} [${v.contactId}]\n> ${v.totalMessages} msg (${formatBytes(v.totalBytes)}) | avg ${formatBytes(avg)}`;
      }).join("\n\n");

      textParts.push(`${title}\n${itemLines}`);
    }

    return `*GLOBAL MESSAGE STATS*\n\nTotal Pesan : ${totalMessages} (${formatBytes(totalBytes)})\n\n${textParts.join("\n\n")}`;
  }

  deleteAllMessages() {
    db.exec("DELETE FROM messages;");
    saveDb();
    return "Semua riwayat pesan berhasil dihapus.";
  }

  saveMessage(m, raw) {
    if (!m || !m.key || !m.key.id) return undefined;
    try {
      const message_id = m.key.id;
      const chatJid = m.chat?.id || m.chat;
      const userJid = m.sender || m.contact?.primaryId;

      const chatContact = contactStore.getContact(chatJid) || contactStore.upsertAndGetContact({ primaryId: chatJid });
      const userContact = contactStore.getContact(userJid) || contactStore.upsertAndGetContact({ primaryId: userJid });

      const content_type = m.type || m.contentType?.content || "conversation";
      const content_id = getContentId(content_type);
      const text = m.text || m.body || null;
      const timestamp = m.timestamp || Math.floor(Date.now() / 1000);

      let buffer = null;
      const rawObject = raw || { key: m.key, message: m.message, messageTimestamp: timestamp, pushName: m.pushname };
      try {
        buffer = proto.WebMessageInfo.encode(rawObject).finish();
      } catch {
        try {
          buffer = Buffer.from(JSON.stringify(rawObject));
        } catch {}
      }

      let node = null;
      if (m.node) {
        try {
          node = encodeBinaryNode(m.node);
        } catch {}
      } else if (raw) {
        try {
          node = Buffer.from(JSON.stringify(raw));
        } catch {}
      }

      queryRun(
        `INSERT INTO messages (message_id, chat_id, contact_id, content_id, text, timestamp, buffer, node)
         VALUES (:message_id, :chat_id, :contact_id, :content_id, :text, :timestamp, :buffer, :node)`,
        {
          ":message_id": message_id,
          ":chat_id": chatContact?.id || null,
          ":contact_id": userContact?.id || null,
          ":content_id": content_id,
          ":text": text,
          ":timestamp": timestamp,
          ":buffer": buffer,
          ":node": node,
        }
      );

      const lastRow = queryGet("SELECT max(id) as id FROM messages");
      return lastRow ? lastRow.id : undefined;
    } catch (e) {
      console.error("Gagal menyimpan pesan ke database:", e.message);
      return undefined;
    }
  }

  getDataByMessageId(messageId) {
    if (!messageId || typeof messageId !== "string") return undefined;
    return queryGet(
      "SELECT * FROM messages WHERE message_id = :messageId ORDER BY id DESC LIMIT 1",
      { ":messageId": messageId }
    );
  }
}

export const messageStore = new MessageStore();
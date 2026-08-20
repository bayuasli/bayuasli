await import('./config.js');

import makeWASocket, {
  Browsers,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  proto
} from 'baileys';

import { Boom } from '@hapi/boom';
import fs from 'fs';
import pino from 'pino';
import serialize, { Client } from '#lib/system/serialize.js';
import log from '#lib/system/logger.js';
import PluginsLoad from '#lib/system/loadPlugins.js';
import sqlAuth from '#lib/system/sqlauth.js';
import printMessage from '#lib/system/print.js';
import { syncFromParticipants, contactStore } from '#store/contact-store.js';
import { messageStore } from '#store/message-store.js';
import Func from '#lib/system/function.js';

const loader = new PluginsLoad('./plugins', { debug: true });
await loader.load();
global.plugins = loader.plugins;
global.pluginLoader = loader;

const MAX_MSG_PER_CHAT = 20;
const MAX_CHATS = 300;
const GC_INTERVAL = 10 * 60 * 1000;

let handler = null;
let gcInterval = null;

async function loadHandler() {
  try {
    handler = (await import(`./handler.js?v=${Date.now()}`)).default;
  } catch (err) {
    log.error('Gagal load handler:', err.message);
  }
}

global.reloadHandler = loadHandler;

await loadHandler();
setInterval(loadHandler, 30000);

function runGC(conn) {
  if (!conn.messages) return;
  for (const [chat, msgs] of conn.messages.entries()) {
    if (msgs.length > MAX_MSG_PER_CHAT) {
      conn.messages.set(chat, msgs.slice(-MAX_MSG_PER_CHAT));
    }
  }
  if (conn.messages.size > MAX_CHATS) {
    const keys = [...conn.messages.keys()];
    for (const key of keys.slice(0, conn.messages.size - MAX_CHATS)) {
      conn.messages.delete(key);
    }
  }
  if (global.gc) global.gc();
}

async function startWA() {
  const { state, saveCreds } = await sqlAuth('./sessions');

  let version = [2, 3000, 1015901307];
  try {
    const { version: latestVersion } = await fetchLatestBaileysVersion();
    version = latestVersion;
  } catch (err) {
    log.error('Gagal mengambil versi Baileys terbaru, menggunakan fallback:', err.message);
  }

  const conn = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Edge'),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    getMessage: async key => {
      if (!conn.messages) return undefined;
      const msgs = conn.messages.get(key.remoteJid) || [];
      return msgs.find(x => x.id === key.id)?.message;
    }
  });

  await Client(conn);
  conn.chats ??= {};
  conn.messages = new Map();

  if (gcInterval) clearInterval(gcInterval);
  gcInterval = setInterval(() => runGC(conn), GC_INTERVAL);

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await conn.requestPairingCode(PAIRING_NUMBER, 'SIBAYUXD');
        log.info('Pairing Code: ' + code);
      } catch (err) {
        log.error('Gagal ambil pairing code: ' + err);
      }
    }, 3000);
  }

  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection) log.info('Connection Status: ' + connection);

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (conn.ws) {
        try { conn.ws.close(); } catch {}
      }

      switch (statusCode) {
        case 408:
        case 503:
        case 428:
        case 515:
          await startWA();
          break;

        case 401:
        case 403:
        case 405:
          fs.rmSync('./sessions', { recursive: true, force: true });
          await startWA();
          break;

        default:
          await startWA();
      }
    }

    if (connection === 'open') {
      log.success('Z3PH BOT CONNECTED SUCCESSFULLY.');
      const chats = await conn.groupFetchAllParticipating().catch(() => ({}));
      conn.chats = chats;

      for (const [jid, metadata] of Object.entries(chats)) {
        if (metadata?.subject) {
          try {
            Promise.resolve(syncFromParticipants(metadata.participants || [])).catch(() => {});
          } catch {}
          contactStore.upsertAndGetContact({
            primaryId: jid,
            name: metadata.subject
          });
        }
      }

      for (const plugin of Object.values(global.plugins || {})) {
        if (typeof plugin?.onLoad === 'function') {
          try {
            Promise.resolve(plugin.onLoad(conn)).catch(err => log.error('onLoad error:', err.message));
          } catch {}
        }
      }
    }
  });

  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('group-participants.update', async ({ id, participants, action }) => {
    let metadata = conn.chats[id];

    if (!metadata) {
      try {
        metadata = await conn.groupMetadata(id);
        conn.chats[id] = metadata;
      } catch (e) {
        log.error('Gagal fetch metadata grup:', e.message);
        return;
      }
    }

    switch (action) {
      case 'add':
      case 'revoked_membership_requests':
        for (const jid of participants) {
          if (!metadata.participants.some(p => p.id === jid)) {
            metadata.participants.push({ id: jid, admin: null });
          }
        }
        break;

      case 'demote':
      case 'promote':
        for (const jid of participants) {
          const target = metadata.participants.find(p => p.id === jid);
          if (target) target.admin = action === 'promote' ? 'admin' : null;
        }
        break;

      case 'remove':
        metadata.participants = metadata.participants.filter(p => !participants.includes(p.id));
        break;
    }

    try {
      Promise.resolve(syncFromParticipants(metadata.participants)).catch(() => {});
    } catch {}
  });

  conn.ev.on('presence.update', ({ id, presences }) => {
    try {
      const sender = Object.keys(presences)[0] || id;
      const presence = presences[sender]?.lastKnownPresence || 'composing';
      const jid = conn.getJid(sender);
      conn.chats[jid] ??= { id: jid };
      conn.chats[jid].presences = presence;
    } catch (e) {
      log.error('Presence update gagal:', e.message);
    }
  });

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const raw = messages[0];
    if (!raw) return;

    const m = await serialize(conn, raw).catch(() => null);
    if (!m) return;

    if (raw.messageStubType != null) {
      m.messageStubType = raw.messageStubType;
      m.messageStubParameters = raw.messageStubParameters;
    }

    setImmediate(() => {
      try {
        messageStore.saveMessage(m, raw);
      } catch {}
    });

    conn.messages ??= new Map();
    if (!conn.messages.has(m.chat)) conn.messages.set(m.chat, []);
    const chatMsgs = conn.messages.get(m.chat);
    chatMsgs.push(m);
    if (chatMsgs.length > MAX_MSG_PER_CHAT) chatMsgs.shift();

    if (m.chat.endsWith('@broadcast') || m.chat.endsWith('@newsletter')) {
      for (const plugin of Object.values(global.plugins || {})) {
        if (typeof plugin?.on === 'function') {
          try {
            Promise.resolve(plugin.on(conn, m, { Func })).catch(() => {});
          } catch {}
        }
      }
      return;
    }

    if (m.messageStubType != null) {
      for (const plugin of Object.values(global.plugins || {})) {
        if (typeof plugin?.on === 'function') {
          try {
            Promise.resolve(plugin.on(conn, m, { Func })).catch(() => {});
          } catch {}
        }
      }
    }

    if (!m.message || m.isBot) return;
    if (m.type === 'protocolMessage') return;

    try {
      Promise.resolve(printMessage(conn, m)).catch(() => {});
    } catch {}

    try {
      if (handler) await handler(conn, m);
    } catch (err) {
      log.error('Handler error:', err.message);
    }
  });
}

process.on('uncaughtException', (err) => {
  log.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

startWA();
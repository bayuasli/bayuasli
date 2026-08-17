import { jidNormalizedUser } from 'baileys';
import log from '#lib/system/logger.js';

export function bind(conn) {
  conn.chats ??= {};

  const decodeJid = (jid) => {
    if (!jid) return '';
    return jidNormalizedUser(jid);
  };

  const updateNameToDb = (contacts) => {
    if (!contacts) return;
    try {
      const list = Array.isArray(contacts) ? contacts : contacts.contacts || [contacts];
      for (const contact of list) {
        if (!contact?.id) continue;
        const id = decodeJid(contact.id);
        if (!id || id === 'status@broadcast') continue;

        const isGroup = id.endsWith('@g.us');
        const existing = conn.chats[id] || {};

        conn.chats[id] = {
          ...existing,
          ...contact,
          id,
          ...(isGroup
            ? { subject: contact.subject || contact.name || existing.subject || '' }
            : { name: contact.notify || contact.name || contact.verifiedName || existing.name || existing.notify || '' })
        };
      }
    } catch (e) {
      log.error('Error store updateNameToDb:', e.message);
    }
  };

  conn.ev.on('contacts.upsert', updateNameToDb);
  conn.ev.on('contacts.set', updateNameToDb);

  conn.ev.on('groups.update', async (groupsUpdates) => {
    try {
      for (const update of groupsUpdates) {
        const id = decodeJid(update.id);
        if (!id || !id.endsWith('@g.us') || id === 'status@broadcast') continue;

        let chat = (conn.chats[id] ??= { id });
        chat.isChats = true;

        if (update.subject) chat.subject = update.subject;

        const metadata = await conn.groupMetadata(id).catch(() => null);
        if (metadata) {
          chat.metadata = metadata;
          chat.subject = update.subject || metadata.subject;
        }
      }
    } catch (e) {
      log.error('Error store groups.update:', e.message);
    }
  });

  conn.ev.on('chats.set', async ({ chats }) => {
    try {
      if (!Array.isArray(chats)) return;
      for (let { id, name, readOnly } of chats) {
        id = decodeJid(id);
        if (!id || id === 'status@broadcast') continue;
        const isGroup = id.endsWith('@g.us');

        let chat = (conn.chats[id] ??= { id });
        chat.isChats = !readOnly;
        if (name) chat[isGroup ? 'subject' : 'name'] = name;

        if (isGroup) {
          const metadata = await conn.groupMetadata(id).catch(() => null);
          if (metadata) {
            chat.metadata = metadata;
            if (name || metadata.subject) chat.subject = name || metadata.subject;
          }
        }
      }
    } catch (e) {
      log.error('Error store chats.set:', e.message);
    }
  });

  conn.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      if (!id) return;
      id = decodeJid(id);
      if (id === 'status@broadcast') return;

      let chat = (conn.chats[id] ??= { id });
      chat.isChats = true;

      const metadata = await conn.groupMetadata(id).catch(() => null);
      if (metadata) {
        chat.subject = metadata.subject;
        chat.metadata = metadata;
      }
    } catch (e) {
      log.error('Error store group-participants.update:', e.message);
    }
  });

  conn.ev.on('chats.upsert', (chatsUpsert) => {
    try {
      const list = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];
      for (const item of list) {
        if (!item?.id || item.id === 'status@broadcast') continue;
        const id = decodeJid(item.id);
        conn.chats[id] = {
          ...(conn.chats[id] || {}),
          ...item,
          id,
          isChats: true
        };
      }
    } catch (e) {
      log.error('Error store chats.upsert:', e.message);
    }
  });

  conn.ev.on('presence.update', async ({ id, presences }) => {
    try {
      if (!id || !presences) return;
      const sender = Object.keys(presences)[0] || id;
      const _sender = decodeJid(sender);
      const presence = presences[sender]?.lastKnownPresence || 'composing';

      let chat = (conn.chats[_sender] ??= { id: sender });
      chat.presences = presence;

      if (id.endsWith('@g.us')) {
        if (!conn.chats[id]) {
          const metadata = await conn.groupMetadata(id).catch(() => null);
          if (metadata) {
            conn.chats[id] = { id, subject: metadata.subject, metadata, isChats: true };
          }
        }
      }
    } catch (e) {
      log.error('Error store presence.update:', e.message);
    }
  });
}

export default { bind };
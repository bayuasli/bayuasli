import fs from 'fs';
import path from 'path';

const DB_PATH = './lib/database/antifdmsg.json';

function loadConfig() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({}));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfig(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export default {
  name: 'antifdmsg',
  category: 'group',
  command: ['antifdmsg'],
  alias: ['afd'],
  settings: {
    owner: false,
    private: false,
    group: true,
    admin: true,
    botAdmin: true,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    if (!m.isGroup) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return m.reply('Hanya untuk grup.');
    }

    const args = m.args || [];
    const sub = (args[0] || '').toLowerCase();
    const config = loadConfig();

    if (!sub) {
      const status = config[m.chat] ? 'ON' : 'OFF';
      return m.reply(
        'ANTI FAKE/MSG\n\n' +
        'Status: ' + status + '\n\n' +
        'Usage:\n' +
        '.antifdmsg on - aktifkan\n' +
        '.antifdmsg off - nonaktifkan'
      );
    }

    if (sub === 'on') {
      config[m.chat] = true;
      saveConfig(config);
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return m.reply('Anti Fake/DMsg diaktifkan.');
    }

    if (sub === 'off') {
      config[m.chat] = false;
      saveConfig(config);
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return m.reply('Anti Fake/DMsg dinonaktifkan.');
    }

    return m.reply('Gunakan: .antifdmsg on/off');
  },

  on: async (conn, m) => {
    try {
      if (!m.isGroup) return;
      if (m.fromMe) return;
      if (m.type === 'protocolMessage') return;

      const config = loadConfig();
      if (!config[m.chat]) return;

      const message = m.message || {};
      const protocol = message.protocolMessage;
      const secret = message.secretEncryptedMessage;

      if (!protocol && !secret) return;

      let targetId = null;
      let source = null;

      if (secret && secret.secretEncType === 'MESSAGE_EDIT') {
        source = 'secretEncryptedMessage';
        targetId = secret.targetMessageKey?.id;
      } else if (protocol && protocol.type === 14) {
        source = 'protocolMessage';
        targetId = protocol.key?.id;
      }

      if (!targetId) return;

      await conn.sendMessage(m.chat, {
        text: '⚠️ Fake/DMsg terdeteksi!\n\n' +
        'Pengirim: @' + m.sender.split('@')[0] + '\n' +
        'Target ID: ' + targetId + '\n' +
        'Tipe: ' + source + '\n\n' +
        'Pengirim dikeluarkan dari grup.',
        contextInfo: { mentionedJid: [m.sender] }
      }, { quoted: m });

      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
    } catch (err) {
      console.error('[antifdmsg]', err);
    }
  }
};
export default {
  name: 'delmsg',
  category: 'other',
  command: ['dmsg', 'delmsg', 'fdel'],
  alias: [],
  settings: {
    owner: true,
    group: true,
    loading: false
  },

  run: async (conn, m) => {
    if (!m.isGroup) return;
    if (!m.isQuoted) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return;
    }

    const stanzaId = m.quoted.id;

    try {
      const tempId = await conn.relayMessage(
        m.chat,
        {
          groupStatusMessageV2: {
            message: {
              extendedTextMessage: {
                text: '',
                contextInfo: {
                  isGroupStatus: true
                }
              }
            }
          }
        },
        {}
      );

      const tempId2 = await conn.relayMessage(
        m.chat,
        {
          protocolMessage: {
            key: {
              jid: m.chat,
              fromMe: true,
              id: tempId
            },
            type: 14,
            editedMessage: {
              extendedTextMessage: {
                text: '\0',
                contextInfo: {
                  isGroupStatus: false
                }
              }
            }
          }
        },
        {
          messageId: stanzaId
        }
      );

      await new Promise(r => setTimeout(r, 100));

      await Promise.allSettled([
        conn.sendMessage(m.chat, {
          delete: {
            remoteJid: m.chat,
            id: tempId,
            fromMe: true
          }
        }),
        conn.sendMessage(m.chat, {
          delete: {
            remoteJid: m.chat,
            id: tempId2,
            fromMe: true
          }
        })
      ]);

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (err) {
      console.error('[dmsg]', err);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    }
  }
};
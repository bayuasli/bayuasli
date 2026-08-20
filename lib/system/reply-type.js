import {
  generateMessageIDV2,
  prepareWAMessageMedia,
  proto
} from 'baileys'
import fs from 'fs'
import path from 'path'
import Func from '#lib/system/function.js'
import { gc } from '#lib/helper/quoted.js'

async function getThumbnail() {
  try {
    const targetDir = global.thumbnailDir || 'lib/media'
    const dir = path.join(process.cwd(), targetDir)
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      if (files.length > 0) {
        const randomFile = files[Math.floor(Math.random() * files.length)]
        return fs.readFileSync(path.join(dir, randomFile))
      }
    }
  } catch {}
  return await Func.getBuffer(global.thumbnailUrl)
}

function getContactQuoted(conn, m) {
  const ownerNumber = global.ownerNumber?.[0] || '6288228819127'
  const ownername = global.namebot || global.title || '#–케이·Z3PHWOLF'

  return {
    key: {
      participant: '0@s.whatsapp.net',
      ...(m.chat ? { remoteJid: 'status@broadcast' } : {})
    },
    message: {
      contactMessage: {
        displayName: ownername,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${ownername};;;\nFN:${ownername}\nitem1.TEL;waid=${ownerNumber}:${ownerNumber}\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
        sendEphemeral: true
      }
    }
  }
}

export const replyHandlers = {
  biasa: async (conn, m, text, options) => {
    const content = typeof text === 'string' ? { text } : { ...text }
    return conn.sendMessage(
      m.chat,
      { ...content, ...options },
      { quoted: m, ephemeralExpiration: m.expiration, ...options }
    )
  },

  kontak: async (conn, m, text, options, { thumbnail }) => {
    const sendMsg = typeof text === 'string' ? { text } : { ...text }
    return conn.sendMessage(
      m.chat,
      {
        ...sendMsg,
        contextInfo: {
          mentionedJid: typeof text === 'string' ? [...conn.parseMention(text)] : [],
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: global.title || 'sbyuxD',
            body: global.body || 'sbyuxD',
            mediaType: 1,
            previewType: 'PHOTO',
            renderLargerThumbnail: false,
            thumbnail,
            sourceUrl: 'https://sbyuxd.dev'
          }
        },
        ...options
      },
      { quoted: getContactQuoted(conn, m), ephemeralExpiration: m.expiration, ...options }
    )
  },

  ct: async (conn, m, text, options) => {
    const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : text || 'Selesai.'
    const mentions = options.mentions || [...String(content).matchAll(/@(\d+)/g)].map(v => v[1] + '@s.whatsapp.net')
    const messageId = generateMessageIDV2()

    const { imageMessage: i } = await prepareWAMessageMedia(
      { image: { url: global.thumbnailUrl } },
      { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
    )

    let faviconData = {}
    try {
      const { imageMessage: fav } = await prepareWAMessageMedia(
        { image: { url: global.thumbnailUrl } },
        { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
      )
      faviconData = {
        faviconMMSMetadata: {
          thumbnailDirectPath: fav.directPath,
          thumbnailSha256: fav.fileSha256,
          thumbnailEncSha256: fav.fileEncSha256,
          mediaKey: fav.mediaKey,
          mediaKeyTimestamp: fav.mediaKeyTimestamp,
          thumbnailHeight: 48,
          thumbnailWidth: 48
        }
      }
    } catch {}

    const messageObj = {
      extendedTextMessage: {
        title: global.title || 'sbyuxD',
        description: global.body || 'sbyuxD',
        text: 'https://sbyuxd.dev\n' + content,
        matchedText: 'https://sbyuxd.dev',
        previewType: 'NONE',
        inviteLinkGroupTypeV2: 'DEFAULT',
        thumbnailDirectPath: i.directPath,
        thumbnailSha256: i.fileSha256,
        thumbnailEncSha256: i.fileEncSha256,
        mediaKey: i.mediaKey,
        mediaKeyTimestamp: i.mediaKeyTimestamp,
        thumbnailWidth: i.width,
        thumbnailHeight: i.height,
        jpegThumbnail: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAADElEQVR4nGNgGG4AAADSAAFQmYCvAAAAAElFTkSuQmCC',
        contextInfo: {
          mentionedJid: mentions,
          expiration: m.expiration || 0,
          stanzaId: m.key.id,
          participant: m.sender,
          quotedMessage: m.message
        },
        ...faviconData
      }
    }

    const wamc = proto.Message.fromObject(messageObj)
    await conn.relayMessage(m.chat, wamc, { messageId })
    return {
      key: { remoteJid: m.chat, fromMe: true, id: messageId },
      message: messageObj
    }
  },

  ctv2: async (conn, m, text, options) => {
    const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : text || 'Selesai.'
    const mentions = options.mentions || [...String(content).matchAll(/@(\d+)/g)].map(v => v[1] + '@s.whatsapp.net')
    const thumbBuffer = await Func.getBuffer(global.thumbnailUrl)
    const messageId = generateMessageIDV2()

    const messageContent = {
      extendedTextMessage: {
        text: `https://sbyuxd.dev\n${content}`,
        matchedText: 'https://sbyuxd.dev',
        description: global.body || 'WhatsApp Bot',
        title: global.title || 'sbyuxD',
        previewType: 0,
        jpegThumbnail: thumbBuffer,
        contextInfo: {
          mentionedJid: mentions,
          expiration: m.expiration || 0,
          stanzaId: m.key.id,
          participant: m.sender,
          quotedMessage: m.message
        }
      }
    }

    await conn.relayMessage(m.chat, messageContent, { messageId })
    return {
      key: { remoteJid: m.chat, fromMe: true, id: messageId },
      message: messageContent
    }
  },

  catalog: async (conn, m, text, options, { thumbnail }) => {
    const messageId = generateMessageIDV2()
    return conn.relayMessage(
      m.chat,
      {
        orderMessage: {
          orderId: 'Z3PH',
          thumbnail,
          itemCount: 1,
          status: 1,
          surface: 1,
          message: typeof text === 'string' ? text : '',
          orderTitle: global.title || 'sbyuxD',
          token: 'bxx-sbyuxd',
          totalAmount1000: '1',
          totalCurrencyCode: 'USD',
          messageVersion: 1,
          contextInfo: {
            externalAdReply: {
              title: global.title || 'sbyuxD',
              body: global.body || 'sbyuxD',
              thumbnail,
              mediaType: 1,
              renderLargerThumbnail: false,
              showAdAttribution: false,
              sourceUrl: 'https://sbyuxd.dev'
            }
          }
        }
      },
      { messageId }
    )
  },

  signup: async (conn, m, text) => {
    return conn.relayMessage(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: { title: '#-비 Z3PHWOLF', hasMediaAttachment: false },
              body: { text: typeof text === 'string' ? text : '' },
              footer: { text: 'sbyuxD !' },
              nativeFlowMessage: {
                buttons: [{ name: 'inapp_signup', buttonParamsJson: '{}' }],
                messageParamsJson: '{}'
              }
            }
          }
        }
      },
      {
        messageId: generateMessageIDV2(),
        quoted: gc,
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
              }
            ]
          }
        ]
      }
    )
  }
}

export function getReplyTypes() {
  return Object.keys(replyHandlers)
}

export async function handleReply(conn, m, text, options = {}) {
  const currentType = global.replyType || 'biasa'
  const handler = replyHandlers[currentType] || replyHandlers.biasa

  const thumbnail = await getThumbnail()

  try {
    await conn.sendPresenceUpdate('composing', m.chat)
  } catch {}

  return await handler(conn, m, text, options, { thumbnail })
}
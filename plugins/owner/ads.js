import { generateWAMessageFromContent } from 'baileys'
import sharp from 'sharp'
import crypto from 'crypto'
import axios from 'axios'

const settings = {
  title: 'Ad',
  body: 'sbyuxD !',
  defaultText: 'https://t.me/Z3PHRINE',
  image: 'https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg',
  sourceUrl: 'https://sbyuxd.dev',
  sourceType: 'ad',
  sourceApp: 'sbyuxDapp',
  renderLargerThumbnail: true,
  showAdAttribution: true,
  containsAutoReply: true,
  automatedGreetingMessageShown: true,
  clickToWhatsappCall: true,
  adContextPreviewDismissed: false
}

export default {
  name: 'ads',
  command: ['ads'],
  alias: [],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  async run(conn, m, { downloadM, quoted }) {
    const inputText = m.text?.trim() || settings.defaultText
    const caption = `Pesan ini dikirim oleh *Z3PH*\n\n${inputText}\n\n> _Z3PH_`

    let thumbnailBuffer = null

    if (quoted?.isMedia) {
      try {
        thumbnailBuffer = await downloadM()
      } catch {}
    } else if (m.isMedia) {
      try {
        thumbnailBuffer = await downloadM()
      } catch {}
    }

    if (!thumbnailBuffer) {
      try {
        const { data } = await axios.get(settings.image, { responseType: 'arraybuffer' })
        thumbnailBuffer = Buffer.from(data)
      } catch {}
    }

    const externalAdReply = {
      title: settings.title,
      body: settings.body,
      mediaType: 1,
      renderLargerThumbnail: settings.renderLargerThumbnail,
      showAdAttribution: settings.showAdAttribution,
      sourceUrl: settings.sourceUrl,
      sourceType: settings.sourceType,
      sourceApp: settings.sourceApp,
      mediaUrl: settings.image,
      thumbnailUrl: settings.image,
      originalImageUrl: settings.image,
      sourceId: Math.floor(Math.random() * 100000000000000).toString(),
      ctwaClid: crypto.randomBytes(32).toString('base64'),
      ref: crypto.randomBytes(8).toString('hex'),
      greetingMessageBody: caption,
      containsAutoReply: settings.containsAutoReply,
      automatedGreetingMessageShown: settings.automatedGreetingMessageShown,
      clickToWhatsappCall: settings.clickToWhatsappCall,
      adContextPreviewDismissed: settings.adContextPreviewDismissed
    }

    if (thumbnailBuffer) {
      try {
        externalAdReply.thumbnail = (
          await sharp(thumbnailBuffer)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 40 })
            .toBuffer()
        ).toString('base64')
      } catch {}
    }

    const messageContent = generateWAMessageFromContent(
      m.chat,
      {
        interactiveMessage: {
          body: { text: caption },
          footer: { text: settings.body },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: '🌐 Kunjungi Web',
                  url: settings.sourceUrl,
                  merchant_url: settings.sourceUrl
                })
              }
            ]
          },
          contextInfo: {
            externalAdReply
          }
        }
      },
      { userJid: conn.user.id }
    )

    await conn.relayMessage(m.chat, messageContent.message, {
      messageId: messageContent.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [
                { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }
              ]
            }
          ]
        }
      ]
    })

    await m.react('✅')
  }
}
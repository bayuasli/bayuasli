import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "baileys";

const relay = async (conn, jid, message, options = {}) => {
  const msg = generateWAMessageFromContent(jid, message, {
    userJid: conn.user?.id,
    ...options,
  });
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
            content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
          },
        ],
      },
    ],
    ...options,
  });
  return msg;
};

const getMedia = async (conn, content) => {
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
  return header;
};

/**
 * Kirim button quick reply
 * @example
 * sendQuickReply(conn, m.chat, {
 *   title: 'Judul',
 *   body: 'Isi pesan',
 *   footer: 'Footer',
 *   buttons: [{ text: 'Klik', id: '.menu' }]
 * }, { quoted: m })
 */
export const sendQuickReply = async (conn, jid, content = {}, options = {}) => {
  const header = await getMedia(conn, content);
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: (content.buttons || []).map((b) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: b.text || b.label,
              id: b.id,
            }),
          })),
        },
      },
    },
    options,
  );
};

/**
 * Kirim button URL
 * @example
 * sendUrlButton(conn, m.chat, {
 *   title: 'Judul',
 *   body: 'Isi pesan',
 *   buttons: [{ text: 'Buka', url: 'https://sibayu.web.id' }]
 * }, { quoted: m })
 */
export const sendUrlButton = async (conn, jid, content = {}, options = {}) => {
  const header = await getMedia(conn, content);
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: (content.buttons || []).map((b) => ({
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: b.text || b.label,
              url: b.url,
              webview_interaction: b.webview || false,
            }),
          })),
        },
      },
    },
    options,
  );
};

/**
 * Kirim button copy
 * @example
 * sendCopyButton(conn, m.chat, {
 *   body: 'Kode promo:',
 *   buttons: [{ text: 'Copy Kode', code: 'PROMO123' }]
 * }, { quoted: m })
 */
export const sendCopyButton = async (conn, jid, content = {}, options = {}) => {
  const header = await getMedia(conn, content);
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: (content.buttons || []).map((b) => ({
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: b.text || b.label,
              copy_code: b.code,
            }),
          })),
        },
      },
    },
    options,
  );
};

/**
 * Kirim button call
 * @example
 * sendCallButton(conn, m.chat, {
 *   body: 'Hubungi kami:',
 *   buttons: [{ text: 'Telepon', number: '628895307489' }]
 * }, { quoted: m })
 */
export const sendCallButton = async (conn, jid, content = {}, options = {}) => {
  const header = await getMedia(conn, content);
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: (content.buttons || []).map((b) => ({
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              display_text: b.text || b.label,
              id: b.number || b.id,
            }),
          })),
        },
      },
    },
    options,
  );
};

/**
 * Kirim list/dropdown selection
 * @example
 * sendList(conn, m.chat, {
 *   title: 'Judul',
 *   body: 'Pilih menu:',
 *   listTitle: 'Buka Menu',
 *   sections: [
 *     {
 *       title: 'Kategori',
 *       rows: [{ title: 'Menu', description: 'Lihat menu', id: '.menu' }]
 *     }
 *   ]
 * }, { quoted: m })
 */
export const sendList = async (conn, jid, content = {}, options = {}) => {
  const header = await getMedia(conn, content);
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: content.listTitle || "Pilih",
                sections: content.sections || [],
              }),
            },
          ],
        },
      },
    },
    options,
  );
};

/**
 * Kirim button location
 * @example
 * sendLocationButton(conn, m.chat, {
 *   body: 'Bagikan lokasi kamu:'
 * }, { quoted: m })
 */
export const sendLocationButton = async (
  conn,
  jid,
  content = {},
  options = {},
) => {
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "" },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: [
            { name: "send_location", buttonParamsJson: JSON.stringify({}) },
          ],
        },
      },
    },
    options,
  );
};

/**
 * Kirim mixed button (campuran semua tipe)
 * @example
 * sendMixedButton(conn, m.chat, {
 *   title: 'Judul',
 *   body: 'Isi pesan',
 *   footer: 'Footer',
 *   image: { url: 'https://...' },
 *   buttons: [
 *     { type: 'reply', text: 'Menu', id: '.menu' },
 *     { type: 'url', text: 'Website', url: 'https://sibayu.web.id' },
 *     { type: 'copy', text: 'Copy', code: 'KODE123' },
 *     { type: 'call', text: 'Telepon', number: '628895307489' },
 *     { type: 'location' }
 *   ]
 * }, { quoted: m })
 */
export const sendMixedButton = async (
  conn,
  jid,
  content = {},
  options = {},
) => {
  const header = await getMedia(conn, content);
  const buttons = (content.buttons || []).map((b) => {
    if (b.type === "reply")
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: b.text || b.label,
          id: b.id,
        }),
      };
    if (b.type === "url")
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: b.text || b.label,
          url: b.url,
          webview_interaction: b.webview || false,
        }),
      };
    if (b.type === "copy")
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: b.text || b.label,
          copy_code: b.code,
        }),
      };
    if (b.type === "call")
      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: b.text || b.label,
          id: b.number || b.id,
        }),
      };
    if (b.type === "location")
      return {
        name: "send_location",
        buttonParamsJson: JSON.stringify({}),
      };
    return b;
  });

  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "", ...header },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: { buttons },
      },
    },
    options,
  );
};

/**
 * Kirim button address
 * @example
 * sendAddressButton(conn, m.chat, {
 *   body: 'Masukkan alamat pengiriman:'
 * }, { quoted: m })
 */
export const sendAddressButton = async (
  conn,
  jid,
  content = {},
  options = {},
) => {
  return relay(
    conn,
    jid,
    {
      interactiveMessage: {
        header: { title: content.title || "" },
        body: { text: content.body || content.text || "" },
        footer: { text: content.footer || "" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "address_message",
              buttonParamsJson: JSON.stringify({
                display_text: content.buttonText || "Isi Alamat",
                id: content.id || "address",
              }),
            },
          ],
        },
      },
    },
    options,
  );
};

export default {
  sendQuickReply,
  sendUrlButton,
  sendCopyButton,
  sendCallButton,
  sendList,
  sendLocationButton,
  sendMixedButton,
  sendAddressButton,
};

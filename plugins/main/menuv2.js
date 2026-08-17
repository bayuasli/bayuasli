import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import moment from "moment-timezone";
import { generateWAMessageFromContent, proto } from "baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THUMBNAIL =
  "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg";

function getTimeGreeting() {
  const hour = moment().tz("Asia/Jakarta").hour();
  let greeting, emoji;
  if (hour >= 2 && hour < 10) {
    greeting = "Pagi";
    emoji = "🌤️";
  } else if (hour >= 10 && hour < 15) {
    greeting = "Siang";
    emoji = "☀️";
  } else if (hour >= 15 && hour < 18) {
    greeting = "Sore";
    emoji = "🌅";
  } else {
    greeting = "Malam";
    emoji = "🌃";
  }
  return { greeting, emoji };
}

export default {
  name: "menu",
  category: "main",
  command: ["menuv2", "h2", "m2"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    await conn.sendMessage(m.chat, { react: { text: "🙄", key: m.key } });

    const uptime = Func.runtime(process.uptime());
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const speed = (performance.now() - m.timesTamp).toFixed(2);

    const timeNow = moment().tz("Asia/Jakarta");
    const time = timeNow.format("HH:mm:ss");
    const dateString = timeNow.format("dddd, DD MMMM YYYY");

    const { greeting, emoji } = getTimeGreeting();
    const fullGreeting = `Halo Kak ${m.pushname || "User"}, Selamat ${greeting} ${emoji}`;

    const grouped = {};
    for (const plugin of Object.values(global.plugins || {})) {
      if (!plugin.category) continue;
      if (!grouped[plugin.category]) grouped[plugin.category] = [];
      grouped[plugin.category].push(plugin.name);
    }

    let footer =
      `⎯⟢ ⚝ *INFO BOT* ⚝ ⟣⎯\n` +
      `╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n` +
      `╎⟜⟞ *⌬ User* : ${m.pushname || "User"}\n` +
      `╎⟜⟞ *⌬ Mode* : ${global.IS_PUBLIC ? "PUBLIC" : "SELF"}\n` +
      `╎⟜⟞ *⌬ Speed* : ${speed} ms\n` +
      `╎⟜⟞ *⌬ RAM* : ${ram} MB\n` +
      `╎⟜⟞ *⌬ Uptime* : ${uptime}\n` +
      `╎⟜⟞ *⌬ Time* : ${time}\n` +
      `╎⟜⟞ *⌬ Action* : ẉ.ceo/Z3PH\n` +
      `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n` +
      `⟡─────────୨ৎ────────⟡\n\n`;

    for (const [category, items] of Object.entries(grouped)) {
      footer += `⎯⟢ ⚝ *${category.toUpperCase()}* ⚝ ⟣⎯\n`;
      footer += ` ╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n`;
      for (const item of items) {
        footer += `╎⟜⟞ *⌬ ${item}*\n`;
      }
      footer += `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n`;
      footer += `⟡─────────୨ৎ────────⟡\n\n`;
    }

    footer +=
      `Total Categories : ${Object.keys(grouped).length}\n` +
      `Total Features   : ${Object.values(grouped).flat().length}\n\n` +
      `⋰──────────────────⋱\n` +
      `       *Creator : ${global.nameown || "sbyuxD"}*\n` +
      `       *Bot Name: ${global.namebotz || "Z3PH BOT"}*\n` +
      `⋰──────────────────⋱`;

    const thumbBuffer = await Func.getBuffer(THUMBNAIL);
    const url = global.linkOwner || "https://wa.me/628895307489";
    const newsletterJid = global.channelJid || "120363428283607430@newsletter";
    const newsletterName = global.namebotz || "#–PUTRA Z3PHRINE";

    const troliQuoted = {
      key: {
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "BAE5C9E3C9A6C8D6",
        participant: "0@s.whatsapp.net",
      },
      message: {
        interactiveMessage: {
          nativeFlowMessage: {
            buttons: [
              {
                name: "review_and_pay",
                buttonParamsJson: JSON.stringify({
                  currency: "IDR",
                  total_amount: { value: 10000000, offset: 100 },
                  reference_id:
                    "REF-" +
                    Math.random().toString(36).substring(7).toUpperCase(),
                  type: "physical-goods",
                  order: {
                    status: "payment_requested",
                    order_type: "PAYMENT_REQUEST",
                    subtotal: { value: 0, offset: 100 },
                    items: [
                      {
                        retailer_id: "item-" + Date.now(),
                        name: m.pushname || "User",
                        amount: { value: 10000000, offset: 100 },
                        quantity: 1,
                      },
                    ],
                  },
                  additional_note: global.namebotz || "Z3PH BOT",
                  native_payment_methods: [],
                  share_payment_status: false,
                }),
              },
            ],
          },
        },
      },
    };

    try {
      const msg = generateWAMessageFromContent(
        m.chat,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                contextInfo: {
                  mentionedJid: [m.sender],
                  forwardingScore: 109,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid,
                    newsletterName: `${newsletterName}★`,
                    serverMessageId: -1,
                  },
                  externalAdReply: {
                    title: newsletterName,
                    body: dateString,
                    thumbnail: thumbBuffer,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                  },
                },
                header: {
                  title: null,
                  subtitle: `┏━━━━━━━━━━━━━━━━━━┓\n ${global.namebotz || "bayu ganteng banget🙄"}  \n┗━━━━━━━━━━━━━━━━━━┛\n`,
                  hasMediaAttachment: false,
                  locationMessage: {
                    degreesLatitude: 35.67657,
                    degreesLongitude: 139.762148,
                    name: fullGreeting,
                    url,
                    address: time,
                    jpegThumbnail: thumbBuffer,
                  },
                },
                body: { text: null },
                footer: { text: footer.trim() },
                nativeFlowMessage:
                  proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: [],
                    messageParamsJson: JSON.stringify({
                      bottom_sheet: {
                        in_thread_buttons_limit: 1,
                        list_title: "ZEPH BOT",
                        button_title: "𖤍",
                      },
                    }),
                  }),
              }),
            },
          },
        },
        {
          quoted: troliQuoted,
          userJid: conn.user?.id,
        },
      );

      await conn.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id,
        quoted: troliQuoted,
      });
    } catch (e) {
      console.error("[menu]", e.message);
      await m.reply(footer.trim());
    }
  },
};

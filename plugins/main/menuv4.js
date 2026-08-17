import moment from "moment-timezone";
import { prepareWAMessageMedia, proto } from "baileys";
import { themeManager } from "#lib/system/theme-manager.js";

const POWERED_JID = "0@s.whatsapp.net";

async function createThumbnailLink(
  conn,
  anyMediaMessageContent,
  thumbnailContent = {},
  mentions = [],
) {
  const {
    text = "sbyuxD",
    description = "sbyuxD",
    title = "Z3PHWOLF BOT",
    url = "https://bayum.sibayu.web.id/",
  } = thumbnailContent;

  const { imageMessage: i } = await prepareWAMessageMedia(
    anyMediaMessageContent,
    {
      upload: conn.waUploadToServer,
      mediaTypeOverride: "thumbnail-link",
    },
  );

  const message_obj = {
    extendedTextMessage: {
      title,
      description,
      text: url + "\n" + text,
      matchedText: url,
      previewType: "NONE",
      inviteLinkGroupTypeV2: "DEFAULT",
      thumbnailDirectPath: i.directPath,
      thumbnailSha256: i.fileSha256,
      thumbnailEncSha256: i.fileEncSha256,
      mediaKey: i.mediaKey,
      mediaKeyTimestamp: i.mediaKeyTimestamp,
      thumbnailWidth: i.width,
      thumbnailHeight: i.height,
      jpegThumbnail:
        "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAADElEQVR4nGNgGG4AAADSAAFQmYCvAAAAAElFTkSuQmCC",
      contextInfo: mentions.length ? { mentionedJid: mentions } : undefined,
    },
  };

  const favicon = themeManager.getData().favicon;
  if (favicon) {
    message_obj.extendedTextMessage.faviconMMSMetadata = favicon;
  }

  return proto.Message.fromObject(message_obj);
}

function getTimeGreeting() {
  const hour = moment().tz("Asia/Jakarta").hour();
  if (hour >= 2 && hour < 10) return { greeting: "Pagi", emoji: "🌤️" };
  if (hour >= 10 && hour < 15) return { greeting: "Siang", emoji: "☀️" };
  if (hour >= 15 && hour < 18) return { greeting: "Sore", emoji: "🌅" };
  return { greeting: "Malam", emoji: "🌃" };
}

function getGreetingMessage(greeting) {
  const messages = {
    Pagi: "Semoga harimu cerah dan penuh semangat! ☀️",
    Siang: "Udah makan siang belum? Jangan lupa makan ya! 🍚",
    Sore: "Sore-sore gini enaknya ngapain ya? Santai aja dulu 👀",
    Malam: "Ngapain jam segini belum tidur? Istirahat yang cukup ya! 😴",
  };
  return messages[greeting] || "Selamat datang!";
}

function groupPlugins() {
  const grouped = {};
  for (const plugin of Object.values(global.plugins || {})) {
    if (!plugin.category) continue;
    if (!grouped[plugin.category]) grouped[plugin.category] = [];
    const cmds = Array.isArray(plugin.command)
      ? plugin.command
      : plugin.command
        ? [plugin.command]
        : [];
    const name = cmds[0] || plugin.name || "unknown";
    grouped[plugin.category].push(name);
  }
  return grouped;
}

async function sendCard(conn, m, text) {
  const themeConfig = themeManager.getData();
  const media = {
    image: {
      url:
        global.thumbnailUrl ||
        "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
    },
  };

  const wamc = await createThumbnailLink(
    conn,
    media,
    {
      title: themeConfig.title || "Z3PHWOLF BOT",
      description: themeConfig.description || "WhatsApp Bot Multi-Device",
      text,
      url: themeConfig.url || "https://github.com/sbyuxD/WofBot",
    },
    [POWERED_JID],
  );

  await conn.relayMessage(m.chat, wamc, {});
}

export default {
  name: "menuv4",
  category: "main",
  command: ["menuv4", "allmenuv4", "h4", "m4"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const prefix = m.prefix || ".";
    const grouped = groupPlugins();
    const target = (m.text || "").trim().toLowerCase();

    if (m.command !== "m4" || !target) {
      const { greeting, emoji } = getTimeGreeting();
      const fullGreeting =
        "Halo Kak " +
        (m.pushname || "User") +
        ", Selamat " +
        greeting +
        " " +
        emoji;
      const greetingMessage = getGreetingMessage(greeting);

      let categoryText = "";
      for (const category of Object.keys(grouped)) {
        categoryText +=
          "⌗ " +
          category.charAt(0).toUpperCase() +
          category.slice(1) +
          ` → \`${prefix}m4 ${category}\`\n`;
      }

      const menuText =
        "I'm a WhatsApp bot built with Baileys library. 🚀\n\n" +
        "『 *MENU UTAMA* 』\n\n" +
        fullGreeting +
        "\n" +
        greetingMessage +
        "\n\n" +
        "📌 *Kategori yang tersedia:*\n" +
        categoryText +
        "\n" +
        "📌 *Cara penggunaan:*\n" +
        `• Ketik \`${prefix}m4 all\` untuk melihat semua fitur\n` +
        `• Ketik \`${prefix}m4 <kategori>\` untuk melihat fitur per kategori\n` +
        `  Contoh: \`${prefix}m4 tools\` atau \`${prefix}m4 sticker\`\n\n` +
        "📌 *Informasi Bot:*\n" +
        "• Prefix: `" +
        prefix +
        "`\n" +
        "• Total Plugin: " +
        Object.values(global.plugins || {}).length +
        "\n" +
        "• Total Kategori: " +
        Object.keys(grouped).length +
        "\n" +
        "• Owner: @sbyuxD\n\n" +
        "```Powered @0```";

      return sendCard(conn, m, menuText);
    }

    if (target === "all") {
      let allText = "『 *ALL FEATURES* 』\n\n";

      for (const [category, cmds] of Object.entries(grouped)) {
        allText += `*${category.toUpperCase()}*\n`;
        allText += cmds.map((c) => `• \`${prefix}${c}\``).join("\n");
        allText += "\n\n";
      }

      allText += "```Powered @0```";

      return sendCard(conn, m, allText.trim());
    }

    if (!grouped[target]) {
      const available = Object.keys(grouped)
        .map((c) => `⌗ ${c}`)
        .join("\n");
      return m.reply(
        `Kategori *${target}* tidak ditemukan.\n\nKategori tersedia:\n${available}`,
      );
    }

    const categoryText =
      `『 *${target.toUpperCase()}* 』\n\n` +
      grouped[target].map((c) => `• \`${prefix}${c}\``).join("\n") +
      "\n\n```Powered @0```";

    return sendCard(conn, m, categoryText);
  },
};

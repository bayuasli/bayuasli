import { prepareWAMessageMedia, proto } from "baileys";
import { themeManager } from "#lib/system/theme-manager.js";

const POWERED_JID = "0@s.whatsapp.net";

async function createThumbnailLink(conn, anyMediaMessageContent, thumbnailContent = {}, mentions = []) {
  const BOT_NUMBER = global.PAIRING_NUMBER || conn.user?.id?.split("@")[0]?.split(":")[0] || "";
  const BOT_URL = BOT_NUMBER ? `https://wa.me/${BOT_NUMBER}` : "https://www.whatsapp.com/";

  const {
    text = "sbyuxD",
    description = "WhatsApp Bot Multi-Device",
    title = global.title || "Z3PHWOLF BOT",
    url = BOT_URL,
  } = thumbnailContent;

  const { imageMessage: i } = await prepareWAMessageMedia(
    anyMediaMessageContent,
    {
      upload: conn.waUploadToServer,
      mediaTypeOverride: "thumbnail-link",
    }
  );

  let faviconData = {};
  try {
    const favicon = themeManager?.getData?.()?.favicon;
    if (favicon) {
      faviconData = { faviconMMSMetadata: favicon };
    }
  } catch {}

  const message_obj = {
    extendedTextMessage: {
      title,
      description,
      text: url + "\n\n" + text,
      matchedText: url,
      previewType: "NONE",
      inviteLinkGroupTypeV2: "DEFAULT",
      thumbnailDirectPath: i.directPath,
      thumbnailSha256: i.fileSha256,
      thumbnailEncSha256: i.fileEncSha256,
      mediaKey: i.mediaKey,
      mediaKeyTimestamp: i.mediaKeyTimestamp,
      thumbnailWidth: 736,
      thumbnailHeight: 1075,
      jpegThumbnail: "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAADElEQVR4nGNgGG4AAADSAAFQmYCvAAAAAElFTkSuQmCC",
      contextInfo: {
        mentionedJid: mentions.length ? mentions : [POWERED_JID],
      },
      ...faviconData,
    },
  };

  return proto.Message.fromObject(message_obj);
}

function groupPlugins() {
  const grouped = {};
  for (const plugin of Object.values(global.plugins || {})) {
    if (!plugin.category) continue;
    const cat = plugin.category.toLowerCase();
    if (!grouped[cat]) grouped[cat] = [];
    const cmds = Array.isArray(plugin.command)
      ? plugin.command
      : plugin.command
        ? [plugin.command]
        : [];
    const name = cmds[0] || plugin.name || "unknown";
    if (!grouped[cat].includes(name)) {
      grouped[cat].push(name);
    }
  }
  return grouped;
}

async function sendCard(conn, m, text) {
  let themeConfig = {};
  try {
    themeConfig = themeManager?.getData?.() || {};
  } catch {}

  const BOT_NUMBER = global.PAIRING_NUMBER || conn.user?.id?.split("@")[0]?.split(":")[0] || "";
  const BOT_URL = BOT_NUMBER ? `https://wa.me/${BOT_NUMBER}` : "https://www.whatsapp.com/";

  const media = {
    image: {
      url: global.thumbnailUrl || "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
    },
  };

  const wamc = await createThumbnailLink(
    conn,
    media,
    {
      title: themeConfig.title || global.title || "Z3PHWOLF BOT",
      description: themeConfig.description || global.body || "WhatsApp Bot Multi-Device",
      text,
      url: themeConfig.url || BOT_URL,
    },
    [POWERED_JID]
  );

  await conn.relayMessage(m.chat, wamc, {});
}

export default {
  name: "menuv3",
  category: "main",
  command: ["menuv3", "allmenuv3", "h3", "m3"],
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
    const target = (m.text || m.args?.[0] || "").trim().toLowerCase();

    if (!target) {
      let categoryText = "";
      for (const category of Object.keys(grouped)) {
        categoryText += `• ${category.toUpperCase()} -> \`${prefix}m3 ${category}\`\n`;
      }

      const totalPlugins = Object.values(global.plugins || {}).length;
      const totalCategories = Object.keys(grouped).length;

      const menuText =
        `*DAFTAR MENU UTAMA*\n\n` +
        `*Informasi Bot:*\n` +
        `• Prefix : \`${prefix}\`\n` +
        `• Total Fitur : \`${totalPlugins}\`\n` +
        `• Kategori : \`${totalCategories}\`\n` +
        `• Status : \`Online\`\n\n` +
        `*Kategori Menu:*\n` +
        `${categoryText}\n` +
        `*Navigasi:*\n` +
        `• \`${prefix}m3 all\` : Menampilkan semua fitur\n` +
        `• \`${prefix}m3 <kategori>\` : Menampilkan menu per kategori\n\n` +
        `Powered by @0`;

      return sendCard(conn, m, menuText);
    }

    if (target === "all") {
      let allText = "*DAFTAR SELURUH FITUR*\n\n";

      for (const [category, cmds] of Object.entries(grouped)) {
        allText += `*${category.toUpperCase()}*\n`;
        allText += cmds.map((c) => `• \`${prefix}${c}\``).join("\n");
        allText += "\n\n";
      }

      allText += "Powered by @0";

      return sendCard(conn, m, allText.trim());
    }

    if (!grouped[target]) {
      const available = Object.keys(grouped)
        .map((c) => `• ${c.toUpperCase()}`)
        .join("\n");
      return m.reply(
        `Kategori *${target}* tidak ditemukan.\n\nKategori tersedia:\n${available}`
      );
    }

    const categoryText =
      `*KATEGORI: ${target.toUpperCase()}*\n\n` +
      grouped[target].map((c) => `• \`${prefix}${c}\``).join("\n") +
      "\n\nPowered by @0";

    return sendCard(conn, m, categoryText);
  },
};
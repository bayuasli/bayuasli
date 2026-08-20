import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { prepareWAMessageMedia, proto } from "baileys";
import { themeManager } from "#lib/system/theme-manager.js";

async function getLocalMediaBuffer() {
  const targetDir = path.join(process.cwd(), global.thumbnailDir || "lib/media");
  const priority = ["Z3PH.png"];
  for (const file of priority) {
    const full = path.join(targetDir, file);
    if (fsSync.existsSync(full)) {
      return await fs.readFile(full);
    }
  }
  if (fsSync.existsSync(targetDir)) {
    const list = (await fs.readdir(targetDir)).filter((f) =>
      /\.(png|jpg|jpeg|webp)$/i.test(f)
    );
    if (list.length > 0) {
      return await fs.readFile(path.join(targetDir, list[0]));
    }
  }
  throw new Error("File media lokal tidak ditemukan di ./lib/media/");
}

async function buildCard(conn, mediaContent, { title, description, text }) {
  const theme = themeManager.getData();

  const { imageMessage: i } = await prepareWAMessageMedia(mediaContent, {
    upload: conn.waUploadToServer,
    mediaTypeOverride: "thumbnail-link",
  });

  let faviconData = theme.favicon;

  if (!faviconData) {
    const defaultBuffer = await getLocalMediaBuffer();
    const { imageMessage: favImg } = await prepareWAMessageMedia(
      { image: defaultBuffer },
      {
        upload: conn.waUploadToServer,
        mediaTypeOverride: "thumbnail-link",
      }
    );

    faviconData = {
      thumbnailDirectPath: favImg.directPath,
      thumbnailSha256: favImg.fileSha256,
      thumbnailEncSha256: favImg.fileEncSha256,
      mediaKey: favImg.mediaKey,
      mediaKeyTimestamp: favImg.mediaKeyTimestamp,
      thumbnailHeight: 48,
      thumbnailWidth: 48,
    };
  }

  const obj = {
    extendedTextMessage: {
      title: title || theme.title,
      description: description || theme.description,
      text: (theme.url || "https://sbyuxd.dev") + (text ? "\n" + text : ""),
      matchedText: theme.url || "https://sbyuxd.dev",
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
      faviconMMSMetadata: faviconData,
    },
  };

  return proto.Message.fromObject(obj);
}

async function sendResultCard(conn, m, label, value) {
  const theme = themeManager.getData();
  const mediaBuffer = await getLocalMediaBuffer();

  const wamc = await buildCard(
    conn,
    { image: mediaBuffer },
    {
      title: theme.title,
      description: label,
      text: value || "",
    }
  );

  await conn.relayMessage(m.chat, wamc, { quoted: m });
}

export default {
  name: "theme-manager",
  category: "core",
  command: ["theme", "settheme"],
  alias: ["th"],

  settings: {
    owner: true,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    const args = m.args || [];
    const subCmd = args[0]?.toLowerCase();
    const value = args.slice(1).join(" ");

    if (!subCmd) {
      const config = themeManager.getData();
      return m.reply(
        "```[ THEME MANAGER ]```\n\n" +
          "• *1. SET ICON / FAVICON*\n" +
          "  _Reply gambar_ : `.theme icon`\n" +
          "  _URL gambar_   : `.theme icon https://link.com/image.png`\n\n" +
          "• *2. SET TITLE*\n" +
          "  `.theme title Z3PHWOLF BOT`\n\n" +
          "• *3. SET DESCRIPTION*\n" +
          "  `.theme desc WhatsApp Bot Multi-Device`\n\n" +
          "• *4. SET URL*\n" +
          "  `.theme url https://sbyuxd.dev`\n\n" +
          "• *5. RESET DEFAULT*\n" +
          "  `.theme reset`\n\n" +
          "```[ CURRENT CONFIG ]```\n" +
          "• *Title* : " + (config.title || "not set") + "\n" +
          "• *Desc*  : " + (config.description || "not set") + "\n" +
          "• *URL*   : " + (config.url || "not set") + "\n" +
          "• *Icon*  : " + (config.favicon ? "Custom Favicon" : "Default Favicon (Local Media)")
      );
    }

    try {
      if (subCmd === "icon" || subCmd === "favicon") {
        const quoted = m.isQuoted ? m.quoted : null;
        let imageUrl = value;
        let imageMessage;

        if (quoted?.isMedia) {
          const mime = quoted.msg?.mimetype || "";
          if (!mime.startsWith("image/")) {
            return m.reply("*[ERROR]* Harap reply gambar yang valid.");
          }

          const buffer = await quoted.download();
          ({ imageMessage } = await prepareWAMessageMedia(
            { image: buffer },
            {
              upload: conn.waUploadToServer,
              mediaTypeOverride: "thumbnail-link",
            }
          ));
        } else if (imageUrl && /^https?:\/\//.test(imageUrl)) {
          ({ imageMessage } = await prepareWAMessageMedia(
            { image: { url: imageUrl } },
            {
              upload: conn.waUploadToServer,
              mediaTypeOverride: "thumbnail-link",
            }
          ));
        } else {
          return m.reply(
            "*[ERROR]* Reply gambar atau masukkan URL gambar yang valid.\n\n" +
              "*Contoh*: `.theme icon https://domain.com/image.png`"
          );
        }

        const result = await themeManager.setFavicon({
          thumbnailDirectPath: imageMessage.directPath,
          thumbnailSha256: imageMessage.fileSha256,
          thumbnailEncSha256: imageMessage.fileEncSha256,
          mediaKey: imageMessage.mediaKey,
          mediaKeyTimestamp: imageMessage.mediaKeyTimestamp,
        });

        if (result.error) return m.reply("*[ERROR]* " + result.error);

        const cardBuffer = (quoted?.isMedia && await quoted.download()) || await getLocalMediaBuffer();
        const wamc = await buildCard(
          conn,
          { image: cardBuffer },
          {
            title: themeManager.getData().title,
            description: "Favicon berhasil diperbarui",
            text: "",
          }
        ).catch(() => null);

        if (wamc) {
          await conn.relayMessage(m.chat, wamc, { quoted: m });
        } else {
          await m.reply("*[SUCCESS]* Favicon berhasil diperbarui.");
        }

        return;
      }

      let result;
      let label;
      let displayValue;

      switch (subCmd) {
        case "title":
          result = await themeManager.setTitle(value);
          label = "Title diperbarui";
          displayValue = result.data;
          break;
        case "desc":
        case "description":
          result = await themeManager.setDescription(value);
          label = "Description diperbarui";
          displayValue = result.data;
          break;
        case "url":
          result = await themeManager.setUrl(value);
          label = "URL diperbarui";
          displayValue = result.data;
          break;
        case "reset":
        case "nuke":
          result = await themeManager.nuke();
          label = "Theme direset ke default";
          displayValue = "";
          break;
        default:
          return m.reply(
            "*[ERROR]* Sub-command `" + subCmd + "` tidak dikenal.\n\nGunakan `.theme` untuk melihat daftar perintah."
          );
      }

      if (result.error) return m.reply("*[ERROR]* " + result.error);

      await sendResultCard(conn, m, label, displayValue);
    } catch (e) {
      return m.reply("*[ERROR]* " + e.message);
    }
  },
};
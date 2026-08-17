import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import webp from "node-webpmux";
import JSZip from "jszip";
import https from "https";

const temp = process.platform === "win32" ? process.env.TEMP : tmpdir();

const bufferToWebp = (inputBuffer) =>
  new Promise((resolve, reject) => {
    const tmpIn = path.join(
      temp,
      crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + ".tmp",
    );
    const tmpOut = path.join(
      temp,
      crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + ".webp",
    );

    fs.writeFileSync(tmpIn, inputBuffer);

    ffmpeg(tmpIn)
      .on("error", async (err) => {
        if (fs.existsSync(tmpIn)) await fs.promises.unlink(tmpIn);
        if (fs.existsSync(tmpOut)) await fs.promises.unlink(tmpOut);
        reject(err);
      })
      .on("end", async () => {
        await fs.promises.unlink(tmpIn);
        const buff = fs.readFileSync(tmpOut);
        await fs.promises.unlink(tmpOut);
        resolve(buff);
      })
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=000000[p];[b][p]paletteuse",
        "-loop",
        "0",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
      ])
      .toFormat("webp")
      .saveToFile(tmpOut);
  });

const writeExif = async (buffer, metadata) => {
  let wMedia = buffer;
  try {
    const img = new webp.Image();
    await img.load(wMedia);
  } catch {
    wMedia = await bufferToWebp(wMedia);
  }

  const img = new webp.Image();
  const json = {
    "sticker-pack-id": "sbyuxd-" + Date.now(),
    "sticker-pack-name": metadata?.packName || "",
    "sticker-pack-publisher": metadata?.packPublish || "",
    "android-app-store-link":
      "https://play.google.com/store/apps/details?id=com.bitsmedia.android.muslimpro",
    "ios-app-store-link":
      "https://apps.apple.com/id/app/muslim-pro-al-quran-adzan/id388389451",
    emojis: ["😋", "😎", "🤣"],
    "is-avatar-sticker": 0,
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(wMedia);
  img.exif = exif;
  return await img.save(null);
};

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest();
const toB64Url = (buffer) =>
  Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const isAnimatedWebP = (buffer) => {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  )
    return false;
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunk === "VP8X" && buffer[offset + 8] & 0x02) return true;
    if (chunk === "ANIM" || chunk === "ANMF") return true;
    offset += 8 + size + (size % 2);
  }
  return false;
};

const makeTrayWebp = async (buffer) => {
  const sharp = (await import("sharp")).default;
  return sharp(buffer, { animated: false })
    .resize(252, 252, { fit: "cover" })
    .webp()
    .toBuffer();
};

const makeBlankTrayWebp = async () => {
  const sharp = (await import("sharp")).default;
  return sharp({
    create: {
      width: 252,
      height: 252,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .webp()
    .toBuffer();
};

const makeThumbnailJpeg = async (buffer) => {
  const sharp = (await import("sharp")).default;
  return sharp(buffer).resize(252, 252, { fit: "cover" }).jpeg().toBuffer();
};

const uploadToServer = async (
  conn,
  buffer,
  { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) },
) => {
  const expanded = Buffer.from(
    crypto.hkdfSync(
      "sha256",
      mediaKey,
      Buffer.alloc(32),
      Buffer.from(hkdf),
      112,
    ),
  );
  const iv = expanded.subarray(0, 16);
  const cipherKey = expanded.subarray(16, 48);
  const macKey = expanded.subarray(48, 80);

  const cipher = crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const mac = crypto
    .createHmac("sha256", macKey)
    .update(iv)
    .update(encrypted)
    .digest()
    .subarray(0, 10);
  const encBuffer = Buffer.concat([encrypted, mac]);

  const fileSha256 = sha256(buffer);
  const fileEncSha256 = sha256(encBuffer);

  const iq = await conn.query({
    tag: "iq",
    attrs: {
      id: conn.generateMessageTag?.() ?? Date.now().toString(),
      to: "s.whatsapp.net",
      type: "set",
      xmlns: "w:m",
    },
    content: [{ tag: "media_conn", attrs: {} }],
  });

  const mediaConn = iq.content?.find((v) => v.tag === "media_conn");
  if (!mediaConn) throw new Error("media_conn tidak ditemukan");

  const auth = mediaConn.attrs?.auth;
  if (!auth) throw new Error("auth tidak ditemukan");

  const hosts = (mediaConn.content || [])
    .filter((v) => v.tag === "host")
    .map((v) => v.attrs?.hostname)
    .filter(Boolean);
  if (!hosts.length) throw new Error("host upload tidak ditemukan");

  const token = encodeURIComponent(toB64Url(fileEncSha256));
  let lastError;

  for (const host of hosts) {
    try {
      const json = await new Promise((resolve, reject) => {
        const url = new URL(
          "https://" +
            host +
            mediaPath +
            "/" +
            token +
            "?auth=" +
            encodeURIComponent(auth) +
            "&token=" +
            token,
        );
        const req = https.request(
          {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: "POST",
            headers: {
              Origin: "https://web.whatsapp.com",
              Referer: "https://web.whatsapp.com/",
              "Content-Type": "application/octet-stream",
              "Content-Length": encBuffer.length,
            },
          },
          (res) => {
            let body = "";
            res.on("data", (c) => (body += c));
            res.on("end", () => {
              if (res.statusCode < 200 || res.statusCode >= 300)
                return reject(
                  new Error("Upload gagal " + res.statusCode + ": " + body),
                );
              try {
                resolve(JSON.parse(body));
              } catch {
                reject(new Error("Response bukan JSON: " + body));
              }
            });
          },
        );
        req.on("error", reject);
        req.write(encBuffer);
        req.end();
      });

      const directPath =
        json.direct_path ?? json.directPath ?? json.url ?? json.path;
      if (!directPath) throw new Error("directPath tidak ditemukan");
      return {
        mediaKey,
        fileLength: buffer.length,
        fileSha256,
        fileEncSha256,
        directPath,
        ...json,
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error("Semua host gagal");
};

const sendStickerPack = async (
  conn,
  m,
  pack,
  packNumber = 1,
  totalPacks = 1,
) => {
  const zip = new JSZip();
  const stickersMetadata = [];

  for (const item of pack) {
    const fileName = toB64Url(sha256(item.buffer)) + "." + item.ext;
    zip.file(fileName, item.buffer);
    stickersMetadata.push({
      fileName,
      isAnimated: item.isAnimated,
      emojis: [""],
      accessibilityLabel: "",
      isLottie: item.isLottie,
      mimetype: item.mimetype,
    });
  }

  const trayIconFileName = "tray_icon.webp";
  const traySource = pack.find((v) => !v.isLottie)?.buffer;
  const trayBuffer = traySource
    ? await makeTrayWebp(traySource)
    : await makeBlankTrayWebp();
  zip.file(trayIconFileName, trayBuffer);

  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "STORE",
  });
  const packUpload = await uploadToServer(conn, archive, {
    hkdf: "WhatsApp Sticker Pack Keys",
    mediaPath: "/mms/sticker-pack",
  });
  const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer);
  const thumbUpload = await uploadToServer(conn, thumbnailBuffer, {
    hkdf: "WhatsApp Sticker Pack Thumbnail Keys",
    mediaPath: "/mms/thumbnail-sticker-pack",
    mediaKey: packUpload.mediaKey,
  });

  const packLabel =
    totalPacks > 1 ? " (" + packNumber + "/" + totalPacks + ")" : "";

  await conn.relayMessage(
    m.chat,
    {
      messageContextInfo: { messageSecret: crypto.randomBytes(32) },
      stickerPackMessage: {
        stickerPackId: "Pack_" + crypto.randomBytes(8).toString("hex"),
        name: (global.stickpack || "sbyuxD [ develop ]") + packLabel,
        publisher: global.stickauth || "sbyuxD",
        packDescription:
          "Stiker pack dari Z3PH BOT - " + pack.length + " stiker",
        stickers: stickersMetadata,
        fileLength: packUpload.fileLength,
        fileSha256: packUpload.fileSha256,
        fileEncSha256: packUpload.fileEncSha256,
        mediaKey: packUpload.mediaKey,
        directPath: packUpload.directPath,
        mediaKeyTimestamp: Math.floor(Date.now() / 1000),
        stickerPackSize: packUpload.fileLength,
        stickerPackOrigin: 2,
        trayIconFileName,
        thumbnailDirectPath: thumbUpload.directPath,
        thumbnailSha256: thumbUpload.fileSha256,
        thumbnailEncSha256: thumbUpload.fileEncSha256,
        thumbnailHeight: 252,
        thumbnailWidth: 252,
        imageDataHash: thumbUpload.fileSha256.toString("base64"),
      },
    },
    { quoted: m },
  );
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: "stele",
  category: "sticker",
  command: ["stele", "stikertelegram", "stickertelegram"],
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
    try {
      const token = global.telegram?.token;
      if (!token) return m.reply("Token Telegram belum diset di config.js.");

      const TG_BOT = "https://api.telegram.org/bot" + token;

      const q = m.text?.trim();
      if (!q)
        return m.reply(
          "Stiker Telegram\n\nUsage:\n.stele https://t.me/addstickers/namapack",
        );

      if (!/^https:\/\/t\.me\/addstickers\/[a-zA-Z0-9_]+$/.test(q)) {
        return m.reply(
          "URL tidak valid.\nFormat: https://t.me/addstickers/namapack",
        );
      }

      const packName = q.replace("https://t.me/addstickers/", "");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const res = await fetch(
        TG_BOT + "/getStickerSet?name=" + encodeURIComponent(packName),
      );
      if (!res.ok) throw new Error("Gagal ambil data stiker: " + res.status);

      const json = await res.json();
      if (!json.ok || !json.result?.stickers?.length)
        throw new Error("Data stiker tidak valid.");

      const stickers = json.result.stickers;
      await conn.sendMessage(
        m.chat,
        {
          text:
            "Pack: " +
            packName +
            "\nTotal: " +
            stickers.length +
            " stiker\nSedang diproses...",
        },
        { quoted: m },
      );

      const allPack = [];
      const MAX_PACK_SIZE = 50;

      for (const stickerData of stickers) {
        try {
          const fileRes = await fetch(
            TG_BOT + "/getFile?file_id=" + stickerData.file_id,
          );
          if (!fileRes.ok) continue;

          const fileJson = await fileRes.json();
          if (!fileJson.ok || !fileJson.result?.file_path) continue;

          const imgRes = await fetch(
            "https://api.telegram.org/file/bot" +
              token +
              "/" +
              fileJson.result.file_path,
          );
          if (!imgRes.ok) continue;

          const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
          const stickerBuffer = await writeExif(rawBuffer, {
            packName: global.stickpack || "sbyuxD [ DEVEL0P ]",
            packPublish: global.stickauth || " sbyuxD",
          });

          const isAnimated = isAnimatedWebP(stickerBuffer);
          allPack.push({
            buffer: stickerBuffer,
            ext: "webp",
            mimetype: "image/webp",
            isAnimated,
            isLottie: false,
          });

          await delay(300);
        } catch {
          continue;
        }
      }

      if (!allPack.length)
        throw new Error("Tidak ada stiker yang berhasil diproses.");

      const totalPacks = Math.ceil(allPack.length / MAX_PACK_SIZE);

      for (let i = 0; i < totalPacks; i++) {
        const start = i * MAX_PACK_SIZE;
        const end = Math.min(start + MAX_PACK_SIZE, allPack.length);
        const packSlice = allPack.slice(start, end);

        await sendStickerPack(conn, m, packSlice, i + 1, totalPacks);
        await delay(2000);
      }

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
      await m.reply(
        "Berhasil mengirim " +
          allPack.length +
          " stiker dalam " +
          totalPacks +
          " pack.",
      );
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Gagal: " + e.message);
    }
  },
};

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { prepareWAMessageMedia, generateMessageIDV2, proto } from "baileys";

const DB_PATH = "./lib/database/channels.json";

function loadChannels() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveChannels(channels) {
  fs.writeFileSync(DB_PATH, JSON.stringify(channels, null, 2));
}

function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp", { recursive: true });
      const tmp = path.join("./tmp", Date.now() + "." + ext);
      const out = tmp + "." + ext2;
      await fs.promises.writeFile(tmp, buffer);
      spawn("ffmpeg", ["-y", "-i", tmp, ...args, out])
        .on("error", reject)
        .on("close", async (code) => {
          try {
            await fs.promises.unlink(tmp);
            if (code !== 0) return reject(code);
            const result = await fs.promises.readFile(out);
            await fs.promises.unlink(out);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
    } catch (e) {
      reject(e);
    }
  });
}

function toPTT(buffer, ext) {
  return ffmpeg(
    buffer,
    [
      "-vn",
      "-c:a",
      "libopus",
      "-b:a",
      "128k",
      "-vbr",
      "on",
      "-compression_level",
      "10",
    ],
    ext,
    "opus",
  );
}

export default {
  name: "upch",
  category: "owner",
  command: ["upch"],
  alias: [],
  settings: {
    owner: true,
    loading: false,
  },

  run: async (conn, m) => {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();
    const rest = args.slice(1).join(" ");
    const prefix = m.prefix;
    const quoted = m.isQuoted ? m.quoted : null;
    const isMedia = quoted && quoted.isMedia;
    const mime = isMedia ? quoted.msg?.mimetype || "" : "";

    if (sub === "addid" || sub === "addidch") {
      const id = rest.trim();
      if (!id)
        return m.reply(
          "Masukkan channel ID\nContoh: " +
            prefix +
            "upch addid 120363423327724431@newsletter",
        );
      if (!id.includes("@newsletter")) {
        return m.reply("ID channel harus berakhir dengan @newsletter");
      }

      const channels = loadChannels();
      if (channels.includes(id)) return m.reply("Channel ID sudah ada.");

      channels.push(id);
      saveChannels(channels);
      return m.reply("Channel ID berhasil ditambahkan.\nID: " + id);
    }

    if (sub === "listid" || sub === "listidch") {
      const channels = loadChannels();
      if (channels.length === 0)
        return m.reply("Belum ada channel ID tersimpan.");

      let text = "DAFTAR CHANNEL\n\n";
      for (let i = 0; i < channels.length; i++) {
        text += i + 1 + ". " + channels[i] + "\n";
      }
      return m.reply(text);
    }

    if (sub === "delid" || sub === "delidch") {
      const input = rest.trim();
      if (!input)
        return m.reply(
          "Masukkan nomor channel yang akan dihapus\nContoh: " +
            prefix +
            "upch delid 1,2,3",
        );

      const channels = loadChannels();
      const indices = input
        .split(",")
        .map((n) => parseInt(n.trim()) - 1)
        .filter((i) => !isNaN(i) && i >= 0 && i < channels.length);

      if (indices.length === 0) return m.reply("Nomor tidak valid.");

      const removed = indices.map((i) => channels[i]);
      const remaining = channels.filter((_, i) => !indices.includes(i));
      saveChannels(remaining);

      return m.reply(
        "Channel berhasil dihapus:\n" +
          removed.map((id) => "• " + id).join("\n"),
      );
    }

    const channels = loadChannels();
    if (channels.length === 0) {
      return m.reply(
        "Belum ada channel ID. Tambahkan dulu:\n" + prefix + "upch addid <id>",
      );
    }

    if (!isMedia) {
      return m.reply("Reply foto atau audio yang mau dikirim ke channel");
    }

    if (!/image/.test(mime) && !/audio/.test(mime)) {
      return m.reply("Hanya support foto atau audio");
    }

    try {
      const buffer = await quoted.download();
      if (!buffer) return m.reply("Gagal download media");

      const results = [];

      for (const channelId of channels) {
        try {
          let msg;
          let mediatype;

          if (/image/.test(mime)) {
            msg = await prepareWAMessageMedia(
              { image: buffer },
              { upload: conn.waUploadToServer, jid: "@newsletter" },
            );
            mediatype = "image";
          } else if (/audio/.test(mime)) {
            const ext = mime.split("/")[1] || "mp4";
            const pttBuffer = await toPTT(buffer, ext);
            msg = await prepareWAMessageMedia(
              {
                audio: pttBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
              },
              { upload: conn.waUploadToServer, jid: "@newsletter" },
            );
            mediatype = "audio";
          }

          const node = {
            tag: "message",
            attrs: {
              to: channelId,
              id: generateMessageIDV2(),
              type: "media",
            },
            content: [
              {
                tag: "plaintext",
                attrs: { mediatype: mediatype },
                content: await proto.Message.encode(msg).finish(),
              },
            ],
          };

          await conn.query(node);
          results.push("✅ " + channelId);
        } catch (err) {
          results.push("❌ " + channelId + " (" + err.message + ")");
        }
      }

      return m.reply(
        "HASIL UPLOAD\n\n" +
          results.join("\n") +
          "\n\nTotal: " +
          results.length,
      );
    } catch (err) {
      return m.reply("Error: " + err.message);
    }
  },
};

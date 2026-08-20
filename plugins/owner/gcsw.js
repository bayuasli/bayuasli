// cuma work di baileys 7.0.0-rc.9
import crypto from "node:crypto";
import {
  generateWAMessageContent,
  generateWAMessageFromContent,
} from "baileys";
import { ButtonV2 } from "#helper";

const sessions = new Map();

export default {
  name: "gcsw",
  category: "owner",
  command: ["gcsw"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    const input = m.text?.trim();

    if (sessions.has(m.sender) && input && /^[\d,\s]+$/.test(input)) {
      const { content, groups } = sessions.get(m.sender);
      const indices = [
        ...new Set(input.split(",").map((n) => parseInt(n.trim()) - 1)),
      ];
      const targets = indices.map((i) => groups[i]).filter(Boolean);

      if (!targets.length) return m.reply("Nomor grup tidak valid.");

      sessions.delete(m.sender);

      const results = [];
      for (const target of targets) {
        try {
          const messageSecret = crypto.randomBytes(32);
          const inside = await generateWAMessageContent(content, {
            upload: conn.waUploadToServer,
          });
          const msg = generateWAMessageFromContent(
            target.id,
            {
              messageContextInfo: { messageSecret },
              groupStatusMessageV2: {
                message: { ...inside, messageContextInfo: { messageSecret } },
              },
            },
            {},
          );
          await conn.relayMessage(target.id, msg.message, {
            messageId: msg.key.id,
          });
          results.push(`Sukses: ${target.subject}`);
        } catch {
          results.push(`Gagal: ${target.subject}`);
        }
      }

      return m.reply(`Status grup terkirim:\n\n${results.join("\n")}`);
    }

    const q = m.isQuoted ? m.quoted : null;
    const mime = q?.msg?.mimetype || "";

    const teks =
      q?.msg?.caption || q?.msg?.text || q?.msg?.conversation || m.text || "";

    if (!mime && !teks) {
      return m.reply(
        "Format: *gcsw <pesan>*\n" +
          "Atau reply media lalu ketik *gcsw*\n\n" +
          "Setelah muncul daftar, pilih via Button atau ketik manual:\n" +
          `Contoh: *${m.prefix || ""}gcsw 1,3,7*`,
      );
    }

    let content;
    if (/image/.test(mime)) {
      const media = await q.download();
      content = { image: media, caption: teks };
    } else if (/video/.test(mime)) {
      const media = await q.download();
      content = { video: media, caption: teks };
    } else if (/audio/.test(mime)) {
      const media = await q.download();
      content = { audio: media, mimetype: "audio/mp4", ptt: false };
    } else {
      content = { text: teks, backgroundColor: "#0068ff" };
    }

    const groupsData = await conn.groupFetchAllParticipating();
    const groups = Object.entries(groupsData).map(([id, data]) => ({
      id,
      subject: data.subject,
    }));

    if (!groups.length) return m.reply("Bot belum bergabung di grup manapun.");

    sessions.set(m.sender, { content, groups });

    const rows = groups.map((g, i) => ({
      header: `Grup ${i + 1}`,
      title: g.subject,
      description: `ID: ${g.id.split("@")[0]}`,
      id: `${m.prefix || ""}gcsw ${i + 1}`,
    }));

    const sections = [];
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      sections.push({
        title: `Daftar Grup (${i + 1} - ${Math.min(i + chunkSize, rows.length)})`,
        highlight_label: i === 0 ? "Paling atas" : "",
        rows: rows.slice(i, i + chunkSize),
      });
    }

    const listText =
      `Terdapat ${groups.length} Grup Aktif.\n\n` +
      `Silakan tekan tombol di bawah untuk memilih satu grup, ` +
      `atau balas/ketik manual untuk multi grup.\n\n` +
      `Contoh Manual:\n` +
      `${m.prefix || ""}gcsw 1,2,3`;

    await new ButtonV2(conn)
      .setTitle("GROUP STATUS SENDER")
      .setSubtitle("Pilih Grup Tujuan")
      .setBody(listText)
      .setFooter(global.title || "SBYUXD BOT")
      .setThumbnail(global.thumbnailUrl)
      .addRawButton({
        buttonText: { displayText: "Daftar Grup" },
        buttonId: "list_gc",
        type: 1,
        nativeFlowInfo: {
          name: "single_select",
          paramsJson: JSON.stringify({
            title: "Klik Disini",
            sections: sections,
          }),
        },
      })
      .send(m.chat, { quoted: m });
  },
};

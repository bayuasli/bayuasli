import {
  decodeBinaryNode,
  getDevice,
  jidDecode,
  proto,
  getBinaryNodeChild
} from "baileys";
import { messageStore, getContentById } from "#store/message-store.js";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default {
  name: "message-store",
  category: "core",
  command: ["message", "msg", "m"],

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
    const args = m.args || [];
    const subCommand = args[0]?.toLowerCase();
    const param = args[1];
    const quoted = m.quoted || m.q;
    const quotedId = quoted?.id || quoted?.key?.id;

    try {
      if (subCommand === "stat") {
        if (!param) {
          const resText = messageStore.getChatStatGlobal();
          return m.reply(resText);
        } else {
          const resText = messageStore.getChatStats(param.trim());
          return m.reply(resText);
        }
      }

      if (subCommand === "i" || subCommand === "info") {
        if (!quoted || !quotedId) throw new Error("Reply ke pesan yang mau diperiksa datanya.");
        const data = messageStore.getDataByMessageId(quotedId);
        if (!data || !data.id) throw new Error("Data pesan tidak ditemukan di database.");

        let WAM;
        try {
          WAM = proto.WebMessageInfo.decode(data.buffer);
        } catch {
          throw new Error("Gagal me-decode buffer pesan.");
        }

        let node = null;
        let participantJid = null;
        if (data.node) {
          try {
            node = await decodeBinaryNode(Buffer.from(data.node));
            participantJid = node?.attrs?.participant;
          } catch {
            try {
              const rawNode = JSON.parse(Buffer.from(data.node).toString("utf-8"));
              participantJid = rawNode?.key?.participant;
            } catch {}
          }
        }

        const decodedParticipant = jidDecode(participantJid);
        let deviceType = decodedParticipant?.device ? "Linked Device" : "Phone";
        if (!data.node) deviceType = "-";

        const deviceId = decodedParticipant?.device || "-";
        const platform = getDevice(WAM?.key?.id || quotedId);

        const bizNode = node ? getBinaryNodeChild(node, "biz") : null;
        const metaNode = node ? getBinaryNodeChild(node, "meta") : null;
        const contentInfo = getContentById(data.content_id);

        const infoText =
          `*MESSAGE DB INFO*\n\n` +
          `Index DB : \`#${data.id}\` \n\n` +
          `• *ID* : \`${data.message_id || WAM?.key?.id || quotedId}\`\n` +
          `• *Tipe Konten* : \`${contentInfo?.content || "-"}\`\n` +
          `• *Binary Size* : \`${formatBytes(data.buffer?.length || 0)}\` \n\n` +
          `• *Device* : \`${deviceType}\`\n` +
          `• *Device ID* : \`${deviceId}\`\n` +
          `• *Platform* : \`${platform}\`\n\n` +
          `• *Has Biz Node* : \`${bizNode ? "Ya" : "Tidak"}\`\n` +
          `• *Has Meta Node* : \`${metaNode ? "Ya" : "Tidak"}\``;

        return m.reply(infoText);
      }

      if (subCommand === "delete-all") {
        const resText = messageStore.deleteAllMessages();
        return m.reply(resText);
      }

      if (subCommand === "obj") {
        if (!quoted || !quotedId) throw new Error("Reply ke pesan yang mau diambil objeknya.");
        const data = messageStore.getDataByMessageId(quotedId);
        if (!data || !data.id) throw new Error("Data pesan tidak ditemukan di database.");

        let jsonObject;
        try {
          const decoded = proto.WebMessageInfo.decode(data.buffer);
          jsonObject = proto.WebMessageInfo.toObject(decoded, { longs: String, enums: String, bytes: String, defaults: true });
        } catch {
          try {
            jsonObject = JSON.parse(Buffer.from(data.buffer).toString("utf-8"));
          } catch (err) {
            throw new Error("Gagal me-decode buffer: " + err.message);
          }
        }

        const jsonBuffer = Buffer.from(JSON.stringify(jsonObject, null, 2), "utf-8");
        return conn.sendMessage(
          m.chat,
          {
            document: jsonBuffer,
            mimetype: "application/json",
            fileName: `message-${data.id}.json`,
          },
          { quoted: m }
        );
      }

      if (subCommand === "node") {
        if (!quoted || !quotedId) throw new Error("Reply ke pesan yang mau diambil nodenya.");
        const data = messageStore.getDataByMessageId(quotedId);
        if (!data || !data.id) throw new Error("Data pesan tidak ditemukan di database.");
        if (!data.node) throw new Error("Node pada pesan ini bernilai null.");

        let jsonNode;
        try {
          jsonNode = JSON.parse(Buffer.from(data.node).toString("utf-8"));
        } catch {
          try {
            jsonNode = await decodeBinaryNode(Buffer.from(data.node));
          } catch (err) {
            throw new Error("Gagal me-decode node: " + err.message);
          }
        }

        const jsonBuffer = Buffer.from(JSON.stringify(jsonNode, null, 2), "utf-8");
        return conn.sendMessage(
          m.chat,
          {
            document: jsonBuffer,
            mimetype: "application/json",
            fileName: `node-${data.id}.json`,
          },
          { quoted: m }
        );
      }

      return m.reply(
        `*MESSAGE STORE MANAGER*\n\n` +
          `• \`.m stat\` : Tampilkan statistik pesan global\n` +
          `• \`.m stat [jid]\` : Tampilkan statistik pesan chat spesifik\n` +
          `• \`.m i\` : Reply pesan untuk lihat info DB pesan\n` +
          `• \`.m obj\` : Reply pesan untuk unduh JSON pesan\n` +
          `• \`.m node\` : Reply pesan untuk unduh JSON binary node\n` +
          `• \`.m delete-all\` : Hapus seluruh riwayat pesan dari DB`
      );
    } catch (e) {
      return m.reply(`Gagal mengeksekusi perintah:\n_${e.message}_`);
    }
  },
};
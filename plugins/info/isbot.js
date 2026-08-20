import { jidDecode, decodeBinaryNode } from "baileys";
import { messageStore } from "#store/message-store.js";

export default {
  name: "isbot",
  category: "tools",
  command: ["isbot", "cekbot"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const isQuoted = !!(m.quoted || m.q);
    const target = isQuoted ? (m.quoted || m.q) : m;
    const msgId = target.id || target.key?.id || "";

    if (!msgId) {
      return m.reply("Gagal mengambil ID pesan target.");
    }

    const targetJid = target.sender || m.sender;
    const targetNumber = targetJid?.split("@")[0] || "";

    const dbData = messageStore.getDataByMessageId(msgId);

    let participantJid = null;
    let deviceId = "Primary (0)";

    if (dbData && dbData.node) {
      try {
        const node = await decodeBinaryNode(Buffer.from(dbData.node));
        participantJid = node?.attrs?.participant;
      } catch {
        try {
          const rawNode = JSON.parse(Buffer.from(dbData.node).toString("utf-8"));
          participantJid = rawNode?.key?.participant;
        } catch {}
      }
    }

    if (participantJid) {
      const decoded = jidDecode(participantJid);
      if (decoded?.device) {
        deviceId = String(decoded.device);
      }
    }

    let hardSignals = 0;
    let softSignals = 0;
    const signalDetails = [];

    if (target.isBaileys || msgId.startsWith("BAE5")) {
      hardSignals += 2;
      signalDetails.push("❌ Signature ID Baileys Framework (BAE5)");
    }

    if (target.isBot || msgId.startsWith("SBYUXD") || msgId.startsWith("Z3PH")) {
      hardSignals += 2;
      signalDetails.push("❌ Signature Serializer Bot (SBYUXD/Z3PH)");
    }

    if (msgId.length === 16) {
      hardSignals += 2;
      signalDetails.push("❌ Message ID Length 16 Chars (Standard Bot)");
    } else if (msgId.startsWith("3EB0") && msgId.length !== 32 && msgId.length !== 20) {
      hardSignals += 2;
      signalDetails.push(`❌ Non-Standard 3EB0 ID Length (${msgId.length} Chars)`);
    } else if (msgId.includes("_") || msgId.startsWith("true_") || msgId.startsWith("false_")) {
      hardSignals += 2;
      signalDetails.push("❌ Format ID Whatsapp-Web.JS / WPPConnect");
    } else if (msgId.length < 20) {
      hardSignals += 1;
      signalDetails.push(`❌ Message ID Anomali Singkat (${msgId.length} Chars)`);
    }

    const msgType = target.type || (target.message ? Object.keys(target.message)[0] : "");
    const isInteractive = [
      "interactiveMessage",
      "interactiveResponseMessage",
      "buttonsMessage",
      "buttonsResponseMessage",
      "templateMessage",
      "templateButtonReplyMessage",
      "listMessage",
      "listResponseMessage",
      "orderMessage"
    ].includes(msgType);

    if (isInteractive) {
      hardSignals += 2;
      signalDetails.push(`❌ Komponen Pesan Interaktif Bot (${msgType})`);
    }

    if (target.msg?.contextInfo?.externalAdReply) {
      softSignals += 1;
      signalDetails.push("❌ ContextInfo ExternalAdReply (Bot Signature)");
    }

    if (deviceId !== "Primary (0)") {
      softSignals += 1;
      signalDetails.push(`❌ Linked Secondary Device Session (ID: ${deviceId})`);
    }

    const deviceName = target.device || "android";
    if (deviceName === "web" || deviceName === "desktop") {
      softSignals += 1;
      signalDetails.push(`❌ Session Platform (${deviceName})`);
    }

    if (!target.pushname && !target.name) {
      softSignals += 1;
      signalDetails.push("❌ Tanpa PushName Registered");
    }

    const totalSignals = hardSignals + softSignals;
    const targetInfo = isQuoted ? `Pesan Balasan (@${targetNumber})` : `Pesan Sendiri (@${targetNumber})`;

    if (hardSignals >= 1 || totalSignals >= 2) {
      const confidence = totalSignals >= 3 ? "🔴 Sangat Tinggi" : "🟠 Tinggi";

      const resultText =
        `🔍 *BOT DETECTION RESULT*\n\n` +
        `*Target      :* ${targetInfo}\n` +
        `*Status      :* 🤖 TERDETEKSI BOT\n` +
        `*Device      :* \`${deviceName}/bot\`\n` +
        `*Device ID   :* \`${deviceId}\`\n` +
        `*Message ID  :* \`${msgId}\`\n` +
        `*ID Length   :* \`${msgId.length}\`\n` +
        `*Data Source :* \`Database (WS + Deep)\` \n\n` +
        `*WS SIGNAL*\n` +
        `  ${signalDetails.join("\n  ")}\n\n` +
        `*Analisis:* Terdeteksi dari analisis mendalam ID pesan, tipe komponen interaktif, dan layer WebSocket.\n\n` +
        `*━━━ NILAI KOMBINASI ━━━*\n` +
        `*Sinyal    :* \`${totalSignals} sinyal terdeteksi (${hardSignals} hard, ${softSignals} soft)\`\n` +
        `*Skor      :* \`${totalSignals}\`\n` +
        `*Keyakinan :* ${confidence}\n` +
        `_Pelanggaran struktur pesan asli WhatsApp terdeteksi._\n\n` +
        `> 🔒 Detail teknis sensitif tidak ditampilkan.`;

      return m.reply(resultText, { mentions: [targetJid] });
    } else {
      const resultText =
        `🔍 *BOT DETECTION RESULT*\n\n` +
        `*Target      :* ${targetInfo}\n` +
        `*Status      :* 👤 USER ASLI (HP Utama)\n` +
        `*Device      :* \`${deviceName}\`\n` +
        `*Device ID   :* \`${deviceId}\`\n` +
        `*Message ID  :* \`${msgId}\`\n` +
        `*ID Length   :* \`${msgId.length}\`\n` +
        `*Data Source :* \`Database (WS + Deep)\` \n\n` +
        `*Sinyal      :* \`0 sinyal terdeteksi\`\n` +
        `*Keyakinan   :* 🟢 Sangat Rendah\n\n` +
        `*Analisis:* ID pesan berformat standard 32-hex (${msgId.length} karakter) dan berasal dari perangkat utama.\n` +
        `_Tidak ditemukan indikasi anomali bot._`;

      return m.reply(resultText, { mentions: [targetJid] });
    }
  },
};
import { Button } from "#helper";

function detectAdditionalNodes(targetMessage) {
  const keys = Object.keys(targetMessage);
  const nodes = [];

  if (keys.some((k) => k.startsWith("pollCreationMessage"))) {
    nodes.push({ tag: "meta", attrs: { polltype: "creation" } });
  }

  if (keys.includes("eventMessage") || keys.includes("scheduledCallCreationMessage")) {
    nodes.push({ tag: "meta", attrs: { event_type: "creation" } });
  }

  if (keys.includes("botForwardedMessage")) {
    nodes.push({ attrs: { biz_bot: "1" }, tag: "bot" });
    nodes.push({ attrs: {}, tag: "biz" });
  }

  const interactive =
    targetMessage.interactiveMessage ||
    targetMessage.viewOnceMessage?.message?.interactiveMessage ||
    targetMessage.viewOnceMessageV2?.message?.interactiveMessage ||
    targetMessage.viewOnceMessageV2Extension?.message?.interactiveMessage;

  const buttons = interactive?.nativeFlowMessage?.buttons;

  if (buttons && Array.isArray(buttons) && buttons.length) {
    const buttonNames = [...new Set(buttons.map((b) => b.name))];

    if (buttonNames.includes("cta_catalog")) {
      nodes.push({ tag: "biz", attrs: { native_flow_name: "catalog_message" } });
    } else if (buttonNames.includes("review_and_pay")) {
      nodes.push({ tag: "biz", attrs: { native_flow_name: "order_details" } });
    } else {
      nodes.push({
        tag: "biz",
        attrs: {},
        content: [
          {
            tag: "interactive",
            attrs: { type: "native_flow", v: "1" },
            content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
          },
        ],
      });
    }
  }

  return nodes.length ? nodes : null;
}

function detectAdditionalAttributes(targetMessage) {
  const keys = Object.keys(targetMessage);
  const attrs = {};

  if (keys.includes("protocolMessage") && targetMessage.protocolMessage?.type === 14) {
    attrs.category = "peer";
  }

  return Object.keys(attrs).length ? attrs : null;
}

export default {
  name: "crm",
  category: "owner",
  command: ["crm"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    if (!m.isQuoted) return m.reply("Reply pesan yang mau diambil datanya.");

    const targetMessage = m.quoted.message;
    if (!targetMessage) return m.reply("Gagal mengambil raw message.");

    let raw;
    try {
      raw = JSON.stringify(
        targetMessage,
        (key, value) => {
          if (Buffer.isBuffer(value)) return { __buf: value.toString("base64") };
          if (value?.type === "Buffer" && Array.isArray(value.data)) {
            return { __buf: Buffer.from(value.data).toString("base64") };
          }
          return value;
        },
        2
      );
    } catch (err) {
      return m.reply("Gagal serialize raw message: " + err.message);
    }

    const sizeKb = Buffer.byteLength(raw, "utf-8") / 1024;
    if (sizeKb > 15000) {
      return m.reply(`Raw message terlalu besar (${(sizeKb / 1024).toFixed(1)} MB), proses dibatalkan.`);
    }

    const detectedNodes = detectAdditionalNodes(targetMessage);
    const detectedAttrs = detectAdditionalAttributes(targetMessage);

    const nodesLine = detectedNodes
      ? `\n  additionalNodes: ${JSON.stringify(detectedNodes, null, 2).replace(/\n/g, "\n  ")},`
      : "";

    const attrsLine = detectedAttrs
      ? `\n  additionalAttributes: ${JSON.stringify(detectedAttrs, null, 2).replace(/\n/g, "\n  ")},`
      : "";

    const jsContent = `const jid = m.chat;
const rawContent = ${raw};

function reviveBuffers(obj) {
  if (obj && typeof obj === 'object') {
    if (obj.__buf) return Buffer.from(obj.__buf, 'base64');
    for (let k in obj) {
      obj[k] = reviveBuffers(obj[k]);
    }
  }
  return obj;
}

const content = reviveBuffers(rawContent);

const relayOptions = {
  messageId: "SBYUXD" + Date.now(),${nodesLine}${attrsLine}
};

await conn.relayMessage(jid, content, relayOptions);
return relayOptions.messageId;`;

    const buffer = Buffer.from(jsContent, "utf-8");
    const typeName = m.quoted.type || Object.keys(targetMessage)[0] || "unknown";
    const randomStr = Math.random().toString(36).slice(2, 7);
    const fileName = `${typeName}-${randomStr}.js`;

    try {
      await new Button(conn)
        .setDocument(buffer, { mimetype: "application/javascript", fileName })
        .setBody(
          `*RELAY MESSAGE GENERATED*\n\n` +
            `• *Jenis*   : ${typeName}\n` +
            `• *Ukuran*  : ${sizeKb.toFixed(1)} KB\n` +
            `• *Nodes*   : ${detectedNodes ? detectedNodes[0].attrs?.native_flow_name || detectedNodes[0].tag : "None"}\n` +
            `• *Attrs*   : ${detectedAttrs ? Object.keys(detectedAttrs).join(", ") : "None"}`
        )
        .addReply("Run Code", ".run")
        .send(m.chat, { quoted: m });
    } catch (err) {
      return m.reply("Gagal mengirim file: " + err.message);
    }
  },
};
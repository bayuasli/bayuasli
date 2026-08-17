import { downloadContentFromMessage } from "baileys";
import util from "util";

function cleanCode(input = "") {
  return String(input)
    .replace(/^```(?:js|javascript)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function extractDocumentBuffer(quoted) {
  const isPlainDoc =
    quoted?.msg?.mimetype === "application/javascript" ||
    /\.js$/i.test(quoted?.msg?.fileName || "");

  if (isPlainDoc) {
    return await quoted.download();
  }

  const headerDoc = quoted?.message?.interactiveMessage?.header?.documentMessage;
  const isHeaderDoc =
    headerDoc &&
    (headerDoc.mimetype === "application/javascript" || /\.js$/i.test(headerDoc.fileName || ""));

  if (isHeaderDoc) {
    const stream = await downloadContentFromMessage(headerDoc, "document");
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  return null;
}

export default {
  name: "run",
  category: "owner",
  command: ["run"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { quoted }) => {
    let code = "";

    try {
      const buffer = await extractDocumentBuffer(quoted);
      if (buffer) code = buffer.toString("utf-8");
    } catch (err) {
      return m.reply("Gagal baca file .js: " + err.message);
    }

    if (!code) {
      const sourceText = quoted?.body || quoted?.text || m.text || "";
      code = cleanCode(sourceText);
    }

    if (!code.trim()) return m.reply("Ketik kodenya atau reply teks / file .js.");

    try {
      let result = await eval(`(async () => {\n${code}\n})()`);
      if (typeof result !== "string") {
        result = util.inspect(result, { depth: 2 });
      }
      return m.reply(`*RESULT:*\n\n\`\`\`${result}\`\`\``);
    } catch (err) {
      return m.reply(`*ERROR:*\n\n\`\`\`${util.format(err)}\`\`\``);
    }
  },
};
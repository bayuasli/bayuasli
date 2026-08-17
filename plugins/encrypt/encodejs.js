import fs from "fs";
import path from "path";

export default {
  name: "encodejs",
  category: "encrypt",
  command: ["encjs", "enchard"],

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
      const quoted = m.isQuoted ? m.quoted : m;
      const mime = (quoted.msg || quoted).mimetype || "";

      if (!/javascript|text/.test(mime)) {
        return m.reply("Reply file .js dulu.");
      }

      const originalName =
        quoted.msg?.fileName ||
        quoted.message?.documentMessage?.fileName ||
        `file-${Date.now()}.js`;

      const media = await conn.downloadMediaMessage(quoted);
      if (!media) return m.reply("Gagal ambil file.");

      const code = media.toString();
      const base64 = Buffer.from(code, "utf-8").toString("base64");

      const obfuscated = `// Encoded Hard by Sibayu Official
(function(){
  const decode = Function("return decodeURIComponent(escape(Buffer.from('${base64}','base64').toString()))")();
  eval(decode);
})();`;

      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const filePath = path.join(tmpDir, `${Date.now()}-${originalName}`);
      fs.writeFileSync(filePath, obfuscated);

      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(filePath),
          fileName: originalName,
          mimetype: "application/javascript",
        },
        { quoted: m },
      );

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
      m.reply("Error encode file.");
    }
  },
};

import { Button } from "#helper";

export default {
  name: "cekidch",
  category: "tools",
  command: ["cekidch", "idch"],
  alias: ["chid"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const text = m.text || "";

    if (!text) {
      return m.reply(
        "Cek ID Channel WhatsApp\n\n" +
          "Usage: .cekidch <link_channel>\n" +
          "Contoh: .cekidch https://whatsapp.com/channel/0029Vb8hiKd0gcfQDpEDdf2n",
      );
    }

    if (!text.includes("https://whatsapp.com/channel/")) {
      return m.reply("Link channel tidak valid.");
    }

    try {
      const code = text.split("https://whatsapp.com/channel/")[1];
      const res = await conn.newsletterMetadata("invite", code);

      if (!res || !res.id) {
        return m.reply("Gagal mendapatkan informasi channel.");
      }

      const channelId = res.id;

      await new Button(conn)
        .setTitle("CHANNEL ID")
        .setSubtitle("WhatsApp Channel")
        .setBody("ID: " + channelId)
        .setFooter(global.title || "SBYUXD BOT")
        .addCopy("📋 Salin ID", channelId, { icon: "DOCUMENT" })
        .send(m.chat, { quoted: m });
    } catch (err) {
      console.error("Cek ID Channel Error:", err);
      return m.reply("Error: " + err.message);
    }
  },
};

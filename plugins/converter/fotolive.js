import { sendMotionPhoto } from "#scrape/fotolive.js";

global.fotoliveSession ??= new Map();

export default {
  name: "fotolive",
  category: "converter",
  command: ["fotolive", "livephoto", "motionphoto"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const text = m.text?.trim() || "";
    const sessionId = m.sender;

    if (text.toLowerCase() === "batal" || text.toLowerCase() === "reset") {
      if (global.fotoliveSession.has(sessionId)) {
        global.fotoliveSession.delete(sessionId);
        return m.reply("Sesi Foto Live berhasil dibatalkan.");
      }
      return m.reply("Tidak ada sesi Foto Live yang sedang berjalan.");
    }

    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    if (urls.length >= 2) {
      try {
        await sendMotionPhoto(conn, m.chat, urls[0], urls[1]);
        return;
      } catch (e) {
        return m.reply("Gagal mengalirkan Foto Live dari tautan: " + e.message);
      }
    }

    const quoted = m.quoted || m.q;
    const session = global.fotoliveSession.get(sessionId);

    if (session && Date.now() - session.timestamp > 300000) {
      global.fotoliveSession.delete(sessionId);
    }

    const activeSession = global.fotoliveSession.get(sessionId);

    if (quoted?.isMedia) {
      const mime = quoted.msg?.mimetype || "";

      if (/image/i.test(mime)) {
        try {
          const imageBuffer = await quoted.download();
          global.fotoliveSession.set(sessionId, {
            imageBuffer,
            timestamp: Date.now()
          });

          return m.reply(
            "*FOTO TERSIMPAN*\n\n" +
              "Foto berhasil disimpan ke dalam sesi.\n" +
              "Langkah selanjutnya: Reply video (MP4) yang ingin digabungkan dengan ketik `.fotolive`."
          );
        } catch (e) {
          return m.reply("Gagal mengunduh foto: " + e.message);
        }
      }

      if (/video/i.test(mime)) {
        if (!activeSession || !activeSession.imageBuffer) {
          return m.reply("Reply foto terlebih dahulu untuk memulai sesi Foto Live.");
        }

        try {
          const videoBuffer = await quoted.download();
          await sendMotionPhoto(conn, m.chat, activeSession.imageBuffer, videoBuffer);

          global.fotoliveSession.delete(sessionId);
          return;
        } catch (e) {
          return m.reply("Gagal mengirimkan Foto Live: " + e.message);
        }
      }
    }

    return m.reply(
      "*FOTO LIVE CREATOR*\n\n" +
        "Cara Penggunaan:\n" +
        "1. *Mode Reply* :\n" +
        "   • Reply foto lalu ketik `.fotolive` (Langkah 1)\n" +
        "   • Reply video lalu ketik `.fotolive` (Langkah 2)\n\n" +
        "2. *Mode Tautan* :\n" +
        "   • Ketik `.fotolive <link_foto> <link_video>`\n\n" +
        "• Ketik `.fotolive batal` untuk membatalkan sesi."
    );
  },
};
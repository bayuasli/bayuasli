export default {
  name: "upsw",
  category: "owner",
  command: ["upsw"],
  alias: ["status", "broadcaststatus"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
  },

  run: async (conn, m) => {
    let content = null;
    let type = null;

    if (m.isQuoted) {
      const quoted = m.quoted;
      if (quoted.isMedia) {
        const mediaType = quoted.type;
        if (mediaType === "imageMessage") {
          type = "image";
          const buffer = await quoted.download();
          content = { image: buffer, caption: m.text || "" };
        } else if (mediaType === "videoMessage") {
          type = "video";
          const buffer = await quoted.download();
          content = { video: buffer, caption: m.text || "" };
        } else if (mediaType === "audioMessage") {
          return m.reply("❌ Audio tidak didukung untuk status WhatsApp.");
        } else {
          return m.reply(
            "❌ Hanya gambar atau video yang bisa dijadikan status.",
          );
        }
      } else if (quoted.body) {
        type = "text";
        content = { text: quoted.body };
      } else {
        return m.reply("❌ Reply pesan teks, gambar, atau video.");
      }
    } else if (m.text && m.text.trim()) {
      type = "text";
      content = { text: m.text.trim() };
    } else {
      return m.reply(
        "📢 *Kirim Status Broadcast*\n\n" +
          "Cara penggunaan:\n" +
          "• .upsw <teks>  → kirim status teks\n" +
          "• .upsw reply gambar/video → kirim status media\n\n" +
          "Status akan dikirim ke semua kontak yang diketahui bot.",
      );
    }

    await m.reply("⏳ Mengambil daftar kontak...");

    let groups = await conn.groupFetchAllParticipating();
    let jidList = [
      ...new Set(
        Object.values(groups).flatMap((v) =>
          (v.participants || []).map((p) => p.id),
        ),
      ),
    ];

    if (jidList.length === 0) {
      return m.reply(
        "❌ Tidak ada kontak ditemukan (bot belum join grup manapun).",
      );
    }

    await m.reply(`📤 Mengirim status ke ${jidList.length} kontak...`);

    try {
      await conn.sendMessage("status@broadcast", content, {
        statusJidList: jidList,
        quoted: m,
      });
      return m.reply(`✅ Status berhasil dikirim ke ${jidList.length} kontak.`);
    } catch (err) {
      console.error("Status broadcast error:", err);
      return m.reply(`❌ Gagal mengirim status: ${err.message}`);
    }
  },
};

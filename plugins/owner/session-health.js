import { analyzeAndCleanSession } from "#scrape/sessionhealth.js";

export default {
  name: "sessionhealth",
  category: "owner",
  command: ["ssh", "ssclean", "ssi"],

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
    const action = m.args[0]?.toLowerCase();
    const isCleanMode = action === "clean" || action === "bersihkan" || m.command === "ssclean";

    try {
      const res = await analyzeAndCleanSession(isCleanMode);

      const keyBreakdown = Object.entries(res.keyStats || {})
        .map(([cat, total]) => `  • *${cat}* : \`${total} entri\``)
        .join("\n");

      if (isCleanMode) {
        return m.reply(
          `*AUTH.DB CLEANUP COMPLETED*\n\n` +
            `• *Status Kesehatan* : ${res.healthStatus}\n` +
            `• *Ukuran Awal*     : \`${res.initialSizeMb} MB\`\n` +
            `• *Ukuran Akhir*    : \`${res.finalSizeMb} MB\`\n` +
            `• *Pre-Key Dihapus* : \`${res.cleanedPreKeys} kunci usang\`\n\n` +
            `*Rincian Kunci Tersisa*:\n${keyBreakdown || "  • Tidak ada data"}\n\n` +
            `Database sesi \`auth.db\` berhasil di-vacuum dan di-optimasi tanpa memutus koneksi bot.`
        );
      } else {
        return m.reply(
          `*AUTH.DB HEALTH REPORT*\n\n` +
            `• *Status Kesehatan* : ${res.healthStatus}\n` +
            `• *Ukuran File*     : \`${res.finalSizeMb} MB\`\n\n` +
            `*Rincian Kunci Sesi*:\n${keyBreakdown || "  • Tidak ada data"}\n\n` +
            `Gunakan perintah \`.sessionclean\` untuk membersihkan pre-key usang dan memvakum file \`auth.db\`.`
        );
      }
    } catch (err) {
      return m.reply("Gagal menganalisis auth.db: " + err.message);
    }
  },
};
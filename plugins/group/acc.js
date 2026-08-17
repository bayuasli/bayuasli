export default {
  name: "acc",
  category: "group",
  command: ["acc", "reqjoin"],

  settings: {
    owner: false,
    private: false,
    group: true,
    admin: true,
    botAdmin: true,
    loading: false,
  },

  run: async (conn, m) => {
    try {
      const sub = m.args[0]?.toLowerCase();
      const opt = m.args[1]?.toLowerCase();

      const formatDate = (ts) =>
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(ts * 1000));

      const list = await conn.groupRequestParticipantsList(m.chat);

      if (!sub)
        return m.reply(
          `*[ REQUEST JOIN GROUP ]*\n\n` +
            `• .acc list — lihat daftar request\n` +
            `• .acc approve all — setujui semua\n` +
            `• .acc approve 1|2|3 — setujui nomor tertentu\n` +
            `• .acc reject all — tolak semua\n` +
            `• .acc reject 1|2|3 — tolak nomor tertentu`,
        );

      if (sub === "list") {
        if (!list.length) return m.reply("Tidak ada permintaan bergabung.");
        const text = list
          .map(
            (r, i) =>
              `*${i + 1}.*\n• Nomor: ${r.jid.split("@")[0]}\n• Metode: ${r.request_method}\n• Waktu: ${formatDate(r.request_time)}`,
          )
          .join("\n\n");
        return m.reply(`*Daftar Request Bergabung:*\n\n${text}`);
      }

      if (!["approve", "reject"].includes(sub))
        return m.reply("Sub-command tidak dikenal.");
      if (!list.length) return m.reply("Tidak ada permintaan bergabung.");

      const label = sub === "approve" ? "Menyetujui" : "Menolak";

      if (opt === "all") {
        for (const r of list) {
          await conn.groupRequestParticipantsUpdate(m.chat, [r.jid], sub);
        }
        return m.reply(
          `*${label} semua permintaan bergabung (${list.length} orang).*`,
        );
      }

      const indexes = opt
        ?.split("|")
        .map((n) => parseInt(n.trim()) - 1)
        .filter((n) => !isNaN(n));
      if (!indexes?.length)
        return m.reply(
          "Masukkan nomor urut dari .acc list.\nContoh: .acc approve 1|2|3",
        );

      const targets = indexes.map((i) => list[i]).filter(Boolean);
      if (!targets.length)
        return m.reply("Nomor urut tidak ditemukan di daftar.");

      let res = "";
      for (const [i, r] of targets.entries()) {
        const result = await conn.groupRequestParticipantsUpdate(
          m.chat,
          [r.jid],
          sub,
        );
        const status =
          result[0]?.status === "success" ? "✅ Berhasil" : "❌ Gagal";
        res += `*${i + 1}.* ${r.jid.split("@")[0]} — ${status}\n`;
      }

      await m.reply(`*${label} Permintaan:*\n\n${res.trim()}`);
    } catch (e) {
      await m.reply("Error: " + e.message);
    }
  },
};

import db from "#lib/system/sql.js";

export default {
  name: "topstats",
  category: "group",
  command: ["topmem", "topgc"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  onLoad: async (conn) => {
    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS group_members (
          group_id TEXT,
          user_id TEXT,
          push_name TEXT,
          message_count INTEGER DEFAULT 0,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (group_id, user_id)
        )
      `);

      await db.run(`
        CREATE TABLE IF NOT EXISTS group_stats (
          group_id TEXT PRIMARY KEY,
          group_name TEXT,
          total_messages INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      console.error("[TOPSTATS] Gagal inisialisasi tabel:", e.message);
    }
  },

  on: async (conn, m) => {
    if (!m.isGroup || m.isBot) return;

    const groupId = m.chat;
    const userId = m.sender;
    const pushName = m.pushname || "User";

    try {
      await db.run(
        `
        INSERT INTO group_members (group_id, user_id, push_name, message_count, last_seen)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(group_id, user_id) DO UPDATE SET
          message_count = message_count + 1,
          push_name = COALESCE(EXCLUDED.push_name, push_name),
          last_seen = CURRENT_TIMESTAMP
      `,
        [groupId, userId, pushName],
      );

      await db.run(
        `
        INSERT INTO group_stats (group_id, total_messages)
        VALUES (?, 1)
        ON CONFLICT(group_id) DO UPDATE SET
          total_messages = total_messages + 1
      `,
        [groupId],
      );
    } catch (e) {
      console.error("[TOPSTATS] Gagal merekam statistik:", e.message);
    }
  },

  run: async (conn, m) => {
    if (m.command === "topmem") {
      if (!m.isGroup) return m.reply(global.mess.group);

      const members = await db.all(
        `
        SELECT user_id, push_name, message_count,
               strftime('%s', 'now') - strftime('%s', first_seen) as duration_seconds
        FROM group_members
        WHERE group_id = ?
        ORDER BY message_count DESC
        LIMIT 10
      `,
        [m.chat],
      );

      if (!members?.length)
        return m.reply("Belum ada data aktivitas pesan di grup ini.");

      const medals = [
        "🥇",
        "🥈",
        "🥉",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
      ];
      let text = "📊 *TOP ANGGOTA PALING AKTIF*\n\n";

      members.forEach((mem, index) => {
        const medal = medals[index] || `${index + 1}.`;
        const daysActive = Math.max(1, Math.ceil(mem.duration_seconds / 86400));
        const avgPerDay = (mem.message_count / daysActive).toFixed(1);

        text += `${medal} *TOP ${index + 1}*\n`;
        text += `Nama: ${mem.push_name}\n`;
        text += `ID: ${mem.user_id.split("@")[0]}\n`;
        text += `Jumlah Chat: ${mem.message_count}\n`;
        text += `Rata-rata: ~${avgPerDay} pesan/hari\n\n`;
      });

      return m.reply(text.trim());
    }

    if (m.command === "topgc") {
      const allGroups = await conn.groupFetchAllParticipating();
      const groupIds = Object.keys(allGroups);

      if (!groupIds.length)
        return m.reply("Bot belum bergabung di grup manapun.");

      const placeholders = groupIds.map(() => "?").join(",");
      const stats = await db.all(
        `
        SELECT group_id, total_messages,
               strftime('%s', 'now') - strftime('%s', created_at) as uptime_seconds
        FROM group_stats
        WHERE group_id IN (${placeholders})
        ORDER BY total_messages DESC
        LIMIT 10
      `,
        groupIds,
      );

      if (!stats?.length)
        return m.reply(
          "Belum ada data aktivitas pesan dari grup yang diikuti.",
        );

      const medals = [
        "🥇",
        "🥈",
        "🥉",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
      ];
      let text = "🏆 *TOP GRUP CHAT PALING AKTIF*\n\n";

      stats.forEach((gc, index) => {
        const medal = medals[index] || `${index + 1}.`;
        const metadata = allGroups[gc.group_id];
        const groupName = metadata?.subject || "Grup Tidak Dikenal";
        const memberCount = metadata?.participants?.length || 0;

        const hoursActive = Math.max(1, gc.uptime_seconds / 3600);
        const avgPerHour = (gc.total_messages / hoursActive).toFixed(1);

        text += `${medal} *TOP ${index + 1}*\n`;
        text += `Nama GC: ${groupName}\n`;
        text += `ID GC: ${gc.group_id}\n`;
        text += `Jumlah Member: ${memberCount}\n`;
        text += `Total Chat: ${gc.total_messages}\n`;
        text += `Rata-rata: ~${avgPerHour} pesan/jam\n\n`;
      });

      return m.reply(text.trim());
    }
  },
};

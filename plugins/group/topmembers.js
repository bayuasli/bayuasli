import { db, contactStore } from "#lib/store/contact-store.js";

function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export default {
  name: "topmembers",
  category: "group",
  command: ["topmembers", "leaderboard", "activemembers"],

  settings: {
    owner: false,
    private: false,
    group: true,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const chatContact = contactStore.getContact(m.chat);

    if (!chatContact) {
      return m.reply("Belum ada data riwayat pesan untuk grup ini.");
    }

    const rows = queryAll(
      `SELECT m.contact_id, c.name, c.primary_id as primaryId, count(*) as total
       FROM messages m
       LEFT JOIN contacts c ON m.contact_id = c.id
       WHERE m.chat_id = :chatId
       GROUP BY m.contact_id
       ORDER BY total DESC
       LIMIT 10`,
      { ":chatId": chatContact.id }
    );

    if (!rows || !rows.length) {
      return m.reply("Belum ada riwayat keaktifan anggota yang tersimpan di database.");
    }

    const mentions = [];
    const leaderboardList = rows.map((v, i) => {
      if (v.primaryId) mentions.push(v.primaryId);
      const name = v.name && v.name !== "Unknown" ? v.name : (v.primaryId ? `@${v.primaryId.split("@")[0]}` : "Unknown");
      return `${i + 1}. *${name}* — \`${v.total} pesan\``;
    }).join("\n");

    const text =
      `*TOP 10 ANGGOTA TERAKTIF*\n` +
      `Grup: *${chatContact.name || "Grup"}*\n\n` +
      `${leaderboardList}\n\n` +
      `Data dihitung berdasarkan riwayat pesan yang tersimpan di database.`;

    return m.reply(text, { mentions });
  },
};
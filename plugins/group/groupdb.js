import { db, contactStore } from "#lib/store/contact-store.js";
import { groupMetadataStore } from "#lib/store/group-metadata-store.js";

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
  name: "groupdb",
  category: "group",
  command: ["groupdb", "gminfo"],

  settings: {
    owner: false,
    private: false,
    group: true,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const metadata = await groupMetadataStore.getGroupMetadata(m.chat, conn);
    const chatContact = contactStore.getContact(m.chat);

    if (!chatContact) {
      return m.reply("Data grup belum tersimpan di database.");
    }

    const activeMembers = queryAll(
      `SELECT count(*) as count FROM group_participants WHERE chat_id = :chatId AND kicked_at IS NULL`,
      { ":chatId": chatContact.id }
    );

    const leftMembers = queryAll(
      `SELECT count(*) as count FROM group_participants WHERE chat_id = :chatId AND kicked_at IS NOT NULL`,
      { ":chatId": chatContact.id }
    );

    const adminMap = groupMetadataStore.getAllAdminByGroupJid(m.chat) || {};
    const adminCount = Object.keys(adminMap).length;

    const totalActive = activeMembers[0]?.count || metadata?.participants?.length || 0;
    const totalLeft = leftMembers[0]?.count || 0;

    const text =
      `*DATABASE GROUP INFO*\n\n` +
      `• *Nama Grup* : \`${metadata?.subject || chatContact.name || "Unknown"}\` \n` +
      `• *JID Grup* : \`${m.chat}\` \n` +
      `• *DB ID* : \`#${chatContact.id}\` \n` +
      `• *Total Anggota Aktif* : \`${totalActive}\` \n` +
      `• *Jumlah Admin DB* : \`${adminCount}\` \n` +
      `• *Anggota Keluar/Kicked* : \`${totalLeft}\` \n` +
      `• *Dibuat Oleh* : \`${metadata?.owner ? "@" + metadata.owner.split("@")[0] : "-"}\``;

    const mentions = metadata?.owner ? [metadata.owner] : [];
    return m.reply(text, { mentions });
  },
};
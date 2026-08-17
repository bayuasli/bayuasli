import { ContactStore } from "#lib/store/contact-store.js";
import { messageStore } from "#lib/store/message-store.js";

export default {
  name: "userinfo",
  category: "owner",
  command: ["userinfo", "userdb", "whois"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const quoted = m.quoted || m.q;
    let targetJid = null;

    if (m.mentions && m.mentions.length > 0) {
      targetJid = m.mentions[0];
    } else if (quoted?.sender) {
      targetJid = quoted.sender;
    } else if (m.text) {
      const number = m.text.replace(/[^0-9]/g, "");
      if (number.length >= 5) {
        targetJid = number + "@s.whatsapp.net";
      }
    } else {
      targetJid = m.sender;
    }

    const contact = ContactStore.getContact(targetJid) || ContactStore.getContactByPn(targetJid);

    if (!contact) {
      return m.reply(`Data kontak untuk *@${targetJid.split("@")[0]}* belum terekam di database.`, {
        mentions: [targetJid],
      });
    }

    let statsText = "Belum ada riwayat statistik pesan.";
    try {
      const stats = messageStore.getChatStats(contact.id);
      if (stats) {
        statsText = stats.data || stats.error || statsText;
      }
    } catch (e) {
      statsText = e.message || statsText;
    }

    const text =
      `*DATABASE USER RECORD*\n\n` +
      `• *DB ID* : \`#${contact.id}\` \n` +
      `• *Nama* : \`${contact.name || "Unknown"}\` \n` +
      `• *Primary ID* : \`${contact.primaryId || "-"}\` \n` +
      `• *Secondary ID* : \`${contact.secondaryId || "-"}\` \n` +
      `• *Server* : \`${contact.primaryServer || "-"}\` \n\n` +
      `${statsText}`;

    return m.reply(text, { mentions: [targetJid] });
  },
};
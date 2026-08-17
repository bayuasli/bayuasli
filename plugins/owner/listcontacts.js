import { ContactStore } from "#lib/store/contact-store.js";

export default {
  name: "listcontacts",
  category: "owner",
  command: ["listcontacts", "contactslist", "dblist"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const contacts = ContactStore.getAllContacts();

    if (!contacts || !contacts.length) {
      return m.reply("Database kontak masih kosong.");
    }

    const groups = contacts.filter((c) => c.primaryServer === "g.us");
    const privateUsers = contacts.filter((c) => c.primaryServer === "s.whatsapp.net");
    const lidUsers = contacts.filter((c) => c.primaryServer === "lid");
    const others = contacts.filter((c) => !["g.us", "s.whatsapp.net", "lid"].includes(c.primaryServer));

    const text =
      `*DATABASE CONTACTS SUMMARY*\n\n` +
      `• *Total Kontak* : \`${contacts.length}\`\n` +
      `• *Private User (PN)* : \`${privateUsers.length}\`\n` +
      `• *User (LID)* : \`${lidUsers.length}\`\n` +
      `• *Grup Chat* : \`${groups.length}\`\n` +
      `• *Lainnya* : \`${others.length}\`\n\n` +
      `Gunakan \`.userinfo @user\` untuk melihat rincian data pengguna secara spesifik.`;

    return m.reply(text);
  },
};
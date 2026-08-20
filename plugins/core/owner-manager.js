import fs from "fs";
import path from "path";
import { ContactStore } from "#store/contact-store.js";

const dbPath = path.join(process.cwd(), "lib/database/owners.json");

function readOwnersDB() {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const initial = Array.from(new Set(global.ownerNumber || ["6288228819127", "628895307489"]));
      fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return Array.isArray(data) ? Array.from(new Set(data)) : Array.from(new Set(global.ownerNumber || []));
  } catch {
    return Array.from(new Set(global.ownerNumber || []));
  }
}

function saveOwnersDB(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const cleanList = Array.from(new Set(data));
    fs.writeFileSync(dbPath, JSON.stringify(cleanList, null, 2));
    global.ownerNumber = cleanList;
  } catch {}
}

export default {
  name: "owner-manager",
  category: "core",
  command: ["addown", "delown", "listown", "addowner", "delowner", "listowner"],

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
    const command = m.command;
    let owners = readOwnersDB();
    const quoted = m.quoted || m.q;

    if (command === "addown" || command === "addowner") {
      let targetNumber = null;

      if (m.mentions && m.mentions.length > 0) {
        targetNumber = m.mentions[0].split("@")[0];
      } else if (quoted?.sender) {
        targetNumber = quoted.sender.split("@")[0];
      } else if (m.text) {
        const cleaned = m.text.replace(/[^0-9]/g, "");
        if (cleaned.length >= 5) {
          targetNumber = cleaned;
        }
      }

      if (!targetNumber) {
        return m.reply("Reply pesan target, tag pengguna, atau ketik nomor HP yang ingin dijadikan owner.");
      }

      if (owners.includes(targetNumber)) {
        return m.reply(`Nomor *${targetNumber}* sudah terdaftar sebagai owner.`);
      }

      owners.push(targetNumber);
      saveOwnersDB(owners);

      const targetJid = targetNumber + "@s.whatsapp.net";
      const contact = ContactStore.getContact(targetJid) || ContactStore.getContactByPn(targetNumber);
      const name = contact?.name || conn.getName(targetJid) || "User";

      return m.reply(
        `*BERHASIL MENAMBAHKAN OWNER*\n\n` +
          `• *Nama*  : \`${name}\`\n` +
          `• *Nomor* : \`${targetNumber}\`\n` +
          `• *LID*   : \`${contact?.secondaryId || "-"}\``,
        { mentions: [targetJid] }
      );
    }

    if (command === "listown" || command === "listowner") {
      if (!owners || !owners.length) {
        return m.reply("Daftar owner bot masih kosong.");
      }

      const listText = owners.map((num, i) => {
        const jid = num + "@s.whatsapp.net";
        const contact = ContactStore.getContact(jid) || ContactStore.getContactByPn(num);
        const name = contact?.name || conn.getName(jid) || "Unknown";
        const lid = contact?.secondaryId || "-";

        return `${i + 1}. *${name}*\n   • Nomor : \`${num}\` \n   • LID   : \`${lid}\``;
      }).join("\n\n");

      return m.reply(`*DAFTAR OWNER BOT*\nTotal : \`${owners.length} owner\`\n\n${listText}`);
    }

    if (command === "delown" || command === "delowner") {
      if (!owners || !owners.length) {
        return m.reply("Daftar owner bot masih kosong.");
      }

      let targetNumber = null;
      const indexNum = parseInt(m.text?.trim());

      if (!isNaN(indexNum) && indexNum > 0 && indexNum <= owners.length) {
        targetNumber = owners[indexNum - 1];
      } else if (m.mentions && m.mentions.length > 0) {
        targetNumber = m.mentions[0].split("@")[0];
      } else if (quoted?.sender) {
        targetNumber = quoted.sender.split("@")[0];
      } else if (m.text) {
        const cleaned = m.text.replace(/[^0-9]/g, "");
        if (cleaned.length >= 5) {
          targetNumber = cleaned;
        }
      }

      if (!targetNumber) {
        return m.reply("Gunakan nomor index (\`.delown 1\`), reply pesan, tag pengguna, atau ketik nomor HP yang ingin dihapus.");
      }

      if (!owners.includes(targetNumber)) {
        return m.reply(`Nomor *${targetNumber}* tidak ditemukan dalam daftar owner.`);
      }

      owners = owners.filter((num) => num !== targetNumber);
      saveOwnersDB(owners);

      const targetJid = targetNumber + "@s.whatsapp.net";
      return m.reply(`*BERHASIL MENGHAPUS OWNER*\n\n• *Nomor* : \`${targetNumber}\``, { mentions: [targetJid] });
    }
  },
};
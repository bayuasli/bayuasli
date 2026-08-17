import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "lib/database/groupAccess.json");

function readDB() {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeDB(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch {}
}

export default {
  name: "group-access",
  category: "group",
  command: ["addakses", "delakses", "listakses"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { metadata }) => {
    const command = m.command;
    const db = readDB();
    const targetChat = m.isGroup ? m.chat : (m.text?.trim().endsWith("@g.us") ? m.text.trim() : null);

    if (command === "addakses") {
      if (!targetChat) {
        return m.reply("Eksekusi perintah ini di dalam grup atau sertakan JID grup.\n\nContoh: `.addakses 120363xxx@g.us`");
      }

      if (db.includes(targetChat)) {
        return m.reply("Grup ini sudah memiliki akses penggunaan bot.");
      }

      db.push(targetChat);
      writeDB(db);

      const groupName = metadata?.subject || conn.getName(targetChat) || targetChat;
      return m.reply(`*AKSES GRUP DITAMBAHKAN*\n\n• *Grup* : \`${groupName}\`\n• *JID* : \`${targetChat}\`\n\nSeluruh member di grup ini sekarang dapat menggunakan bot sekalipun dalam mode self.`);
    }

    if (command === "delakses") {
      if (!targetChat) {
        return m.reply("Eksekusi perintah ini di dalam grup atau sertakan JID grup.");
      }

      if (!db.includes(targetChat)) {
        return m.reply("Grup ini belum terdaftar dalam daftar akses.");
      }

      const updated = db.filter((id) => id !== targetChat);
      writeDB(updated);

      const groupName = metadata?.subject || conn.getName(targetChat) || targetChat;
      return m.reply(`*AKSES GRUP DICABUT*\n\n• *Grup* : \`${groupName}\`\n• *JID* : \`${targetChat}\``);
    }

    if (command === "listakses") {
      if (!db.length) {
        return m.reply("Belum ada grup yang diberikan akses khusus.");
      }

      const listText = db.map((jid, i) => {
        const name = conn.getName(jid) || "Grup";
        return `${i + 1}. *${name}*\n   • JID : \`${jid}\``;
      }).join("\n\n");

      return m.reply(`*DAFTAR GRUP BERAKSES*\nTotal : \`${db.length} grup\`\n\n${listText}`);
    }
  },
};
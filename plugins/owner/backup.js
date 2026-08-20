import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { execSync } from "child_process";
import { Button } from "#helper";

function cleanSessionFolder(sessionPath) {
  if (!fs.existsSync(sessionPath)) return;
  const files = fs.readdirSync(sessionPath);
  for (const file of files) {
    if (file === "creds.json") continue;
    const filePath = path.join(sessionPath, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

function createBackupZip() {
  cleanSessionFolder("./sessions");

  const entries = execSync("ls")
    .toString()
    .split("\n")
    .filter(
      (entry) =>
        entry &&
        ![
          "node_modules",
          "package-lock.json",
          "yarn.lock",
          "tmp",
          "backup.zip",
        ].includes(entry),
    );

  if (!entries.length) return null;

  execSync(`zip -r backup.zip ${entries.join(" ")}`);
  return "./backup.zip";
}

async function sendToWa(conn, m, zipPath) {
  await conn.sendMessage(
    m.chat,
    {
      document: fs.readFileSync(zipPath),
      fileName: "Sibayu-bxx.zip",
      mimetype: "application/zip",
      caption: "Backup Sukses",
    },
    { quoted: m },
  );
}

async function sendToTelegram(zipPath) {
  const form = new FormData();
  form.append("chat_id", global.telegram.chatId);
  form.append("caption", "Backup berhasil dibuat");
  form.append("document", fs.createReadStream(zipPath));

  await axios.post(
    `https://api.telegram.org/bot${global.telegram.token}/sendDocument`,
    form,
    { headers: form.getHeaders() },
  );
}

export default {
  name: "backup",
  category: "owner",
  command: ["bp", "backup", "bpsc"],
  alias: [],

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
    const target = m.args?.[0]?.toLowerCase();

    if (!target) {
      return new Button(conn)
        .setTitle("Backup Bot")
        .setBody("Pilih tujuan backup di bawah ini")
        .setFooter("SbyuXd Backup System")
        .addSelection("Pilih Tujuan")
        .makeSection("Tujuan Backup")
        .makeRow("", "WhatsApp", "Kirim file zip ke chat ini", ".backup wa")
        .makeRow("", "Telegram", "Kirim file zip ke Telegram", ".backup tele")
        .makeRow(
          "",
          "Keduanya",
          "Kirim ke WhatsApp dan Telegram",
          ".backup both",
        )
        .send(m.chat, { quoted: m });
    }

    if (!["wa", "tele", "both"].includes(target)) {
      return m.reply("Tujuan tidak dikenali. Pilih: wa, tele, atau both.");
    }

    try {
      const zipPath = createBackupZip();
      if (!zipPath) return m.reply("Tidak ada file untuk dibackup.");

      if (target === "wa" || target === "both") {
        await sendToWa(conn, m, zipPath);
      }

      if (target === "tele" || target === "both") {
        await sendToTelegram(zipPath);
        if (target === "tele")
          await m.reply("Backup berhasil dikirim ke Telegram.");
      }

      fs.unlinkSync(zipPath);
    } catch (err) {
      console.error("BACKUP ERROR:", err);
      await m.reply("Gagal backup: " + err.message);
    }
  },
};

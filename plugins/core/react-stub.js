import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "lib/database/reactStub.json");

function getSettings() {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const defaultData = { enabled: true, emoji: "📸" };
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return { enabled: data.enabled ?? true, emoji: data.emoji || "📸" };
  } catch {
    return { enabled: true, emoji: "📸" };
  }
}

function saveSettings(settings) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(settings, null, 2));
  } catch {}
}

export default {
  name: "react-stub",
  category: "core",
  command: ["reactstub", "stubreact", "setstubemoji"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  async run(conn, m) {
    const settings = getSettings();
    const text = m.text?.trim() || "";

    if (text.toLowerCase() === "on" || text.toLowerCase() === "enable") {
      settings.enabled = true;
      saveSettings(settings);
      return m.reply("*REACT STUB ENABLED*\n\nAuto-react saat terjadi notifikasi stub (grup/sistem) diaktifkan.");
    }

    if (text.toLowerCase() === "off" || text.toLowerCase() === "disable") {
      settings.enabled = false;
      saveSettings(settings);
      return m.reply("*REACT STUB DISABLED*\n\nAuto-react saat terjadi notifikasi stub di-nonaktifkan.");
    }

    if (text) {
      settings.emoji = text;
      saveSettings(settings);
      return m.reply(`*STUB EMOJI SET*\n\nEmoji reaksi notifikasi stub diubah menjadi: ${text}`);
    }

    const status = settings.enabled ? "AKTIF" : "NONAKTIF";
    return m.reply(
      `*SETTINGS REACT STUB*\n\n` +
        `• *Status* : \`${status}\`\n` +
        `• *Emoji*  : ${settings.emoji}\n\n` +
        `*Cara Penggunaan*:\n` +
        `• \`.reactstub on\` : Mengaktifkan auto-react stub\n` +
        `• \`.reactstub off\` : Mematikan auto-react stub\n` +
        `• \`.reactstub <emoji>\` : Mengubah emoji reaksi`
    );
  },

  async on(conn, m) {
    if (!m.messageStubType) return;
    const settings = getSettings();
    if (!settings.enabled) return;

    try {
      await conn.sendMessage(m.chat, {
        react: { text: settings.emoji, key: m.key }
      });
    } catch {}
  }
};
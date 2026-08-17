const ALIAS = new Set(["bxx"]);

const aliasList = Array.from(ALIAS)
  .sort()
  .map((alias, i) => `${i + 1}. ${alias}`)
  .join("\n");

export default {
  name: "lock",
  category: "owner",
  command: ["lock", "unlock", "lick", "diem"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    bypassLock: true,
  },

  run: async (conn, m) => {
    const text = m.text?.trim() || "";
    const command = m.command;

    if (command === "unlock") {
      if (!global.isBotLocked) {
        return m.reply("Bot sedang tidak dalam keadaan terkunci.");
      }
      global.isBotLocked = false;
      return m.reply("🔓 Bot berhasil dibuka kembali (*unlocked*).");
    }

    if (text === "--show-alias") {
      if (global.isBotLocked) return;
      return m.reply(`*LIST ALIAS LOCK*\n\n${aliasList}`);
    }

    const botJid = conn.getJid(conn.user.id);
    const botLid = conn.user?.lid ? conn.getJid(conn.user.lid) : null;
    const mentions = m.mentions || [];

    const selfLock = (m.isGroup || m.isPrivate) && m.fromMe && text === "me";
    const aliasLock = (m.isGroup || m.isPrivate) && ALIAS.has(text.toLowerCase());
    const gcQuotedLock = m.isGroup && !text && m.quoted && (m.quoted.fromMe || m.quoted.sender === botJid || (botLid && m.quoted.sender === botLid));
    const gcMentionLock = m.isGroup && mentions.some((j) => j === botJid || (botLid && j === botLid));
    const pcLock = m.isPrivate && !text && !m.fromMe;
    const directLock = !text || text === "me";

    if (gcMentionLock || gcQuotedLock || pcLock || selfLock || aliasLock || directLock) {
      if (global.isBotLocked) {
        return m.reply("Bot sudah dalam keadaan terkunci.");
      }

      global.isBotLocked = true;
      const userName = m.pushname || m.senderName || "Owner";
      let responseText = `🔒 Bot berhasil dikunci (*locked*). Have a nice day, *${userName}*`;

      if (command === "lick") {
        if (aliasLock) {
          responseText = `Aw, naughty *${userName}*... Iya, iya, bot terkunci.`;
        } else {
          responseText = `Awh~ Typo dikit tidak apa-apa. Bot terkunci!`;
        }
      }

      return m.reply(responseText);
    }
  },
};
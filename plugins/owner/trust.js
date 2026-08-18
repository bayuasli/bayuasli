import { ContactStore } from "#lib/store/contact-store.js";
import { addTrust, removeTrust, getTrustList, findPlugin, getPluginCommands } from "#lib/store/trust-store.js";

export default {
  name: "trust",
  category: "owner",
  command: ["trust", "untrust", "listtrust"],

  settings: {
    owner: true,
    protected: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const command = m.command;
    const args = m.args || [];
    const quoted = m.quoted || m.q;

    if (command === "listtrust") {
      const list = getTrustList();
      if (!list.length) {
        return m.reply("Belum ada pengguna yang masuk ke dalam daftar *Trusted User*.");
      }

      const formatted = list.map((item, i) => {
        const jid = item.jid;
        const num = jid.split("@")[0];
        const contact = ContactStore.getContact(jid) || ContactStore.getContactByPn(num);
        const name = contact?.name || conn.getName(jid) || "Unknown";

        let accessDisplay = "Semua Fitur Owner (Non-Protected)";
        if (item.commands !== "*" && item.commands !== '["*"]') {
          try {
            const parsed = JSON.parse(item.commands);
            accessDisplay = Array.isArray(parsed) ? parsed.join(", ") : parsed;
          } catch {
            accessDisplay = item.commands;
          }
        }

        return `${i + 1}. *Nama*   : \`${name}\`\n   • Nomor  : \`${num}\`\n   • Akses  : \`${accessDisplay}\``;
      }).join("\n\n");

      return m.reply(`*DAFTAR TRUSTED USERS*\nTotal : \`${list.length} pengguna\`\n\n${formatted}`);
    }

    if (command === "trust") {
      let targetJid = null;
      let rawArgs = [];

      if (m.mentions && m.mentions.length > 0) {
        targetJid = m.mentions[0];
        rawArgs = args.filter((a) => !a.startsWith("@"));
      } else if (quoted?.sender) {
        targetJid = quoted.sender;
        rawArgs = args;
      } else if (args[0] && /^[0-9]{5,}$/.test(args[0].replace(/[^0-9]/g, ""))) {
        targetJid = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        rawArgs = args.slice(1);
      }

      if (!targetJid) {
        return m.reply(
          "*PENGGUNAAN TRUST*\n\n" +
            "• Beri akses semua fitur owner non-protected:\n" +
            "  `.trust @user` atau reply user `.trust`\n\n" +
            "• Beri akses plugin/fitur tertentu (semua command di plugin tersebut akan aktif):\n" +
            "  `.trust @user group/hidetag` atau `.trust @user hidetag`\n" +
            "  `.trust @user hidetag, qwa, fotolive`"
        );
      }

      if (!rawArgs.length || rawArgs[0].toLowerCase() === "all") {
        addTrust(targetJid, ["*"]);

        const contact = ContactStore.getContact(targetJid) || ContactStore.getContactByPn(targetJid.split("@")[0]);
        const name = contact?.name || conn.getName(targetJid) || "User";

        return m.reply(
          `*BERHASIL MENAMBAHKAN TRUST*\n\n` +
            `• *Nama*   : \`${name}\`\n` +
            `• *Nomor*  : \`${targetJid.split("@")[0]}\`\n` +
            `• *Akses*  : \`Semua Fitur Owner (Non-Protected)\``,
          { mentions: [targetJid] }
        );
      }

      const pluginInputs = rawArgs.join(" ").split(",").map((s) => s.trim()).filter(Boolean);
      const allExtractedCommands = [];
      const trustedPluginNames = [];

      for (const input of pluginInputs) {
        const plugin = findPlugin(input);
        if (!plugin) {
          return m.reply(`Plugin *${input}* tidak ditemukan di dalam bot.`);
        }

        if (plugin.settings?.protected === true) {
          return m.reply(`Tidak bisa memberikan akses, plugin *${plugin.name || input}* telah di-protect (Khusus Owner Asli).`);
        }

        const cmds = getPluginCommands(plugin);
        if (!cmds.length) {
          return m.reply(`Plugin *${plugin.name || input}* tidak memiliki command terdaftar.`);
        }

        cmds.forEach((c) => allExtractedCommands.push(c));
        trustedPluginNames.push(`• \`${plugin.name || input}\` (Cmd: \`${cmds.join(", ")}\`)`);
      }

      addTrust(targetJid, allExtractedCommands);

      const contact = ContactStore.getContact(targetJid) || ContactStore.getContactByPn(targetJid.split("@")[0]);
      const name = contact?.name || conn.getName(targetJid) || "User";

      return m.reply(
        `*BERHASIL MENAMBAHKAN TRUST*\n\n` +
          `• *Nama*   : \`${name}\`\n` +
          `• *Nomor*  : \`${targetJid.split("@")[0]}\`\n` +
          `• *Plugin yang Diberikan Akses* :\n${trustedPluginNames.join("\n")}`,
        { mentions: [targetJid] }
      );
    }

    if (command === "untrust") {
      let targetJid = null;

      if (m.mentions && m.mentions.length > 0) {
        targetJid = m.mentions[0];
      } else if (quoted?.sender) {
        targetJid = quoted.sender;
      } else if (args[0]) {
        const num = args[0].replace(/[^0-9]/g, "");
        if (num.length >= 5) {
          targetJid = num + "@s.whatsapp.net";
        } else {
          const list = getTrustList();
          const idx = parseInt(args[0]) - 1;
          if (!isNaN(idx) && list[idx]) targetJid = list[idx].jid;
        }
      }

      if (!targetJid) {
        return m.reply("Reply target, tag pengguna, nomor index (.listtrust), atau ketik nomornya.");
      }

      removeTrust(targetJid);
      return m.reply(`Akses *Trust* untuk *@${targetJid.split("@")[0]}* berhasil dicabut.`, { mentions: [targetJid] });
    }
  },
};
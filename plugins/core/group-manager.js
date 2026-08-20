import fs from "fs";
import path from "path";

const DB_PATH = "./lib/database/groups.json";

function loadGroups() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveGroups(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export default {
  name: "group-manager",
  category: "core",
  command: ["gm", "groupm"],
  alias: ["gmanager"],
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
    const sub = (m.args[0] || "").toLowerCase();
    const rest = m.args.slice(1).join(" ");
    const prefix = m.prefix;

    if (!sub) {
      return m.reply(
        "GROUP MANAGER\n\n" +
          "• " +
          prefix +
          "gm create nama\n" +
          "• " +
          prefix +
          "gm leave\n" +
          "• " +
          prefix +
          "gm setname nama baru\n" +
          "• " +
          prefix +
          "gm setdesc deskripsi baru\n" +
          "• " +
          prefix +
          "gm link\n" +
          "• " +
          prefix +
          "gm revoke\n" +
          "• " +
          prefix +
          "gm ephemeral <detik>\n" +
          "• " +
          prefix +
          "gm announce <on/off>\n" +
          "• " +
          prefix +
          "gm restrict <on/off>\n" +
          "• " +
          prefix +
          "gm addmode <on/off>\n" +
          "• " +
          prefix +
          "gm joinmode <on/off>\n" +
          "• " +
          prefix +
          "gm info\n" +
          "• " +
          prefix +
          "gm members\n" +
          "• " +
          prefix +
          "gm admins\n" +
          "• " +
          prefix +
          "gm save\n" +
          "• " +
          prefix +
          "gm list\n" +
          "• " +
          prefix +
          "gm get <jid>\n" +
          "• " +
          prefix +
          "gm count",
      );
    }

    try {
      const isGroup = m.isGroup;
      const chatId = m.chat;
      const groups = loadGroups();

      if (sub === "save") {
        if (!isGroup) return m.reply("Perintah ini hanya untuk grup.");

        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];

        groups[chatId] = {
          id: chatId,
          subject: metadata.subject,
          desc: metadata.desc || "",
          owner: metadata.owner || "",
          createdAt: metadata.creation || Date.now(),
          participants: participants.map((p) => ({
            jid: p.id || p.jid || p.phoneNumber,
            admin: p.admin || null,
            pushname: p.pushName || null,
            lid: p.lid || null,
          })),
          totalMembers: participants.length,
          admins: participants.filter((p) => p.admin).length,
          ephemeral: metadata.ephemeralDuration || 0,
          announce: metadata.announce || false,
          restrict: metadata.restrict || false,
          savedAt: new Date().toISOString(),
        };

        saveGroups(groups);
        return m.reply(
          "Data grup berhasil disimpan.\n\n" +
            "Nama: " +
            metadata.subject +
            "\n" +
            "Total Member: " +
            participants.length +
            "\n" +
            "Total Admin: " +
            participants.filter((p) => p.admin).length,
        );
      }

      if (sub === "list") {
        const entries = Object.entries(groups);
        if (entries.length === 0)
          return m.reply("Belum ada data grup tersimpan.");

        let text = "DAFTAR GRUP (" + entries.length + ")\n\n";
        for (const [jid, data] of entries) {
          text += "• " + (data.subject || "Unknown") + "\n";
          text += "  ID: " + jid + "\n";
          text += "  Member: " + (data.totalMembers || 0) + "\n";
          text += "  Admin: " + (data.admins || 0) + "\n\n";
        }

        return m.reply(text);
      }

      if (sub === "get") {
        const jid = rest.trim();
        if (!jid) return m.reply("Format: " + prefix + "gm get <jid_grup>");

        const data = groups[jid];
        if (!data) return m.reply("Data grup tidak ditemukan.");

        let text =
          "DATA GRUP\n\n" +
          "ID: " +
          data.id +
          "\n" +
          "Nama: " +
          data.subject +
          "\n" +
          "Deskripsi: " +
          (data.desc || "Tidak ada") +
          "\n" +
          "Owner: " +
          (data.owner || "Tidak diketahui") +
          "\n" +
          "Total Member: " +
          data.totalMembers +
          "\n" +
          "Total Admin: " +
          data.admins +
          "\n" +
          "Ephemeral: " +
          data.ephemeral +
          " detik\n" +
          "Announce: " +
          (data.announce ? "ON" : "OFF") +
          "\n" +
          "Restrict: " +
          (data.restrict ? "ON" : "OFF") +
          "\n" +
          "Dibuat: " +
          new Date(data.createdAt).toLocaleString() +
          "\n" +
          "Disimpan: " +
          data.savedAt +
          "\n\n" +
          "MEMBER LIST (" +
          data.totalMembers +
          ")\n";

        const maxShow = 20;
        const members = data.participants || [];
        const show = members.slice(0, maxShow);

        for (const p of show) {
          const name = p.pushname || "Unknown";
          const jid = p.jid || p.phoneNumber || "Unknown";
          text += "• " + name + " (" + jid + ")";
          if (p.admin) text += " [" + p.admin + "]";
          if (p.lid) text += " [LID]";
          text += "\n";
        }

        if (members.length > maxShow) {
          text +=
            "\n... dan " + (members.length - maxShow) + " member lainnya.";
        }

        return m.reply(text);
      }

      if (sub === "count") {
        const totalUsers = new Set();
        for (const [jid, data] of Object.entries(groups)) {
          if (data.participants) {
            for (const p of data.participants) {
              if (p.jid) totalUsers.add(p.jid);
            }
          }
        }

        return m.reply(
          "STATISTIK GRUP\n\n" +
            "Total Grup Tersimpan: " +
            Object.keys(groups).length +
            "\n" +
            "Total User Unik: " +
            totalUsers.size,
        );
      }

      if (
        !isGroup &&
        sub !== "create" &&
        sub !== "join" &&
        sub !== "list" &&
        sub !== "get" &&
        sub !== "count"
      ) {
        return m.reply("Perintah ini hanya untuk grup.");
      }

      if (sub === "create") {
        const name = rest.trim();
        if (!name) return m.reply("Format: " + prefix + "gm create nama_grup");

        const metadata = await conn.groupCreate(name, [m.sender]);
        return m.reply(
          "Grup berhasil dibuat.\n" +
            "Nama: " +
            name +
            "\n" +
            "JID: " +
            metadata.id +
            "\n" +
            "Link: https://chat.whatsapp.com/" +
            (await conn.groupInviteCode(metadata.id)),
        );
      }

      if (sub === "leave") {
        await conn.groupLeave(chatId);
        return m.reply("Berhasil keluar dari grup.");
      }

      if (sub === "setname") {
        const name = rest.trim();
        if (!name) return m.reply("Format: " + prefix + "gm setname nama_baru");

        await conn.groupUpdateSubject(chatId, name);
        return m.reply("Nama grup berhasil diubah menjadi: " + name);
      }

      if (sub === "setdesc") {
        const desc = rest.trim();
        if (!desc)
          return m.reply("Format: " + prefix + "gm setdesc deskripsi_baru");

        await conn.groupUpdateDescription(chatId, desc);
        return m.reply("Deskripsi grup berhasil diubah.");
      }

      if (sub === "link") {
        const code = await conn.groupInviteCode(chatId);
        return m.reply("Link grup: https://chat.whatsapp.com/" + code);
      }

      if (sub === "revoke") {
        const code = await conn.groupRevokeInvite(chatId);
        return m.reply(
          "Link grup berhasil direset.\nLink baru: https://chat.whatsapp.com/" +
            code,
        );
      }

      if (sub === "ephemeral") {
        const seconds = parseInt(rest);
        if (!seconds || seconds < 0)
          return m.reply(
            "Format: " +
              prefix +
              "gm ephemeral <detik>\nContoh: 86400 = 1 hari",
          );

        await conn.groupToggleEphemeral(chatId, seconds);
        return m.reply("Mode ephemeral diubah menjadi " + seconds + " detik.");
      }

      if (sub === "announce") {
        const value = rest.toLowerCase();
        if (!["on", "off"].includes(value))
          return m.reply("Format: " + prefix + "gm announce on/off");

        await conn.groupSettingUpdate(
          chatId,
          value === "on" ? "announcement" : "not_announcement",
        );
        return m.reply("Mode pengumuman: " + (value === "on" ? "ON" : "OFF"));
      }

      if (sub === "restrict") {
        const value = rest.toLowerCase();
        if (!["on", "off"].includes(value))
          return m.reply("Format: " + prefix + "gm restrict on/off");

        await conn.groupSettingUpdate(
          chatId,
          value === "on" ? "locked" : "unlocked",
        );
        return m.reply("Mode restrict: " + (value === "on" ? "ON" : "OFF"));
      }

      if (sub === "addmode") {
        const value = rest.toLowerCase();
        if (!["on", "off"].includes(value))
          return m.reply("Format: " + prefix + "gm addmode on/off");

        await conn.groupMemberAddMode(
          chatId,
          value === "on" ? "admin_add" : "all_member_add",
        );
        return m.reply(
          "Mode add member: " + (value === "on" ? "Admin Only" : "All Members"),
        );
      }

      if (sub === "joinmode") {
        const value = rest.toLowerCase();
        if (!["on", "off"].includes(value))
          return m.reply("Format: " + prefix + "gm joinmode on/off");

        await conn.groupJoinApprovalMode(chatId, value === "on" ? "on" : "off");
        return m.reply(
          "Mode approval join: " + (value === "on" ? "ON" : "OFF"),
        );
      }

      if (sub === "info") {
        const metadata = await conn.groupMetadata(chatId);
        return m.reply(
          "INFO GRUP\n\n" +
            "Nama: " +
            metadata.subject +
            "\n" +
            "ID: " +
            metadata.id +
            "\n" +
            "Deskripsi: " +
            (metadata.desc || "Tidak ada") +
            "\n" +
            "Owner: " +
            (metadata.owner || "Tidak diketahui") +
            "\n" +
            "Total Member: " +
            (metadata.participants?.length || 0) +
            "\n" +
            "Total Admin: " +
            (metadata.participants?.filter((p) => p.admin).length || 0) +
            "\n" +
            "Ephemeral: " +
            (metadata.ephemeralDuration || 0) +
            " detik",
        );
      }

      if (sub === "members") {
        const metadata = await conn.groupMetadata(chatId);
        const members = metadata.participants || [];
        let text = "DAFTAR MEMBER (" + members.length + ")\n\n";
        for (const p of members) {
          text += "• " + (p.id || p.jid || p.phoneNumber || "Unknown");
          const pushname = p.pushName || p.pushname || "";
          if (pushname) text += " (" + pushname + ")";
          if (p.admin) text += " [" + p.admin + "]";
          if (p.lid) text += " [LID]";
          text += "\n";
        }
        return m.reply(text);
      }

      if (sub === "admins") {
        const metadata = await conn.groupMetadata(chatId);
        const admins = (metadata.participants || []).filter((p) => p.admin);
        let text = "DAFTAR ADMIN (" + admins.length + ")\n\n";
        for (const p of admins) {
          text += "• " + (p.id || p.jid || p.phoneNumber || "Unknown");
          const pushname = p.pushName || p.pushname || "";
          if (pushname) text += " (" + pushname + ")";
          text += " [" + p.admin + "]\n";
        }
        return m.reply(text);
      }

      return m.reply(
        "Subcommand tidak dikenal. Ketik " +
          prefix +
          "gm untuk lihat daftar perintah.",
      );
    } catch (e) {
      console.error("[group-manager]", e);
      return m.reply("Gagal: " + e.message);
    }
  },
};

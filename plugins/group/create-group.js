export default {
  name: "create-group",
  category: "owner",
  command: ["cgrup", "cg"],
  alias: ["creategroup"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    try {
      const args = m.args;
      if (!args || args.length === 0) {
        return m.reply("Format: .cgrup nama|jumlah\nContoh: .cgrup sbyuxd|5");
      }

      const input = args.join(" ");
      const [namePart, countPart] = input.split("|");
      const groupName = namePart ? namePart.trim() : "SbyuxD Group";
      const totalGroups = Math.min(Math.max(parseInt(countPart) || 1, 1), 10);

      const jidOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";
      const createdGroups = [];

      for (let i = 1; i <= totalGroups; i++) {
        try {
          const finalName = totalGroups > 1 ? `${groupName} ${i}` : groupName;
          const groupMetadata = await conn.groupCreate(finalName, [jidOwner]);
          const groupId = groupMetadata.id;
          const inviteCode = await conn.groupInviteCode(groupId);

          createdGroups.push({
            number: i,
            name: finalName,
            id: groupId,
            link: `https://chat.whatsapp.com/${inviteCode}`,
          });

          await Func.delay(2000);
        } catch (err) {
          console.error(`Gagal buat grup ke-${i}:`, err);
        }
      }

      if (createdGroups.length === 0) {
        return m.reply("Gagal membuat grup. Cek kembali izin bot.");
      }

      const resultText = [
        `Berhasil membuat ${createdGroups.length} grup`,
        "============================",
      ];

      for (const group of createdGroups) {
        resultText.push(
          `${group.number}. Nama: ${group.name}`,
          `   ID: ${group.id}`,
          `   Link: ${group.link}`,
          "",
        );
      }

      await conn.sendMessage(m.chat, { text: resultText.join("\n") });
    } catch (error) {
      console.error("Error create group:", error);
      m.reply(
        "Terjadi kesalahan saat membuat grup. Pastikan bot memiliki izin admin dan format input benar.",
      );
    }
  },
};

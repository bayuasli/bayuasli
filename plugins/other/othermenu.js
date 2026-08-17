export default {
  name: "othermenu",
  category: "other",
  command: ["joingc", "leavegc", "star", "unstar"],
  alias: ["joininvite", "starmessage", "unstarmessage"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  async run(conn, m) {
    switch (m.command) {
      case "joingc":
      case "joininvite":
        return await joinGcHandler(conn, m);

      case "leavegc":
        return await leaveGcHandler(conn, m);

      case "star":
      case "starmessage":
        return await starHandler(conn, m);

      case "unstar":
      case "unstarmessage":
        return await unstarHandler(conn, m);
    }
  },
};

function extractGroupInviteCode(text = "") {
  const match = text.match(
    /(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9]+)/i,
  );
  return match?.[1] || null;
}

async function joinGcHandler(conn, m) {
  try {
    const sourceText = [m.text, m.quoted?.body, m.quoted?.text, m.body]
      .filter(Boolean)
      .join("\n");

    const code = extractGroupInviteCode(sourceText);

    if (!code) {
      return m.reply(
        "*JOINGC ERROR*\n" +
          "\n" +
          "• Kirim link grup WhatsApp\n" +
          "• Atau reply pesan yang berisi link grup\n" +
          "\n" +
          "Contoh:\n" +
          "```" +
          `${m.prefix || "."}joingc https://chat.whatsapp.com/xxxxxxxxxxxx` +
          "```",
      );
    }

    const result = await conn.groupAcceptInvite(code);

    return m.reply(
      "*JOINGC SUCCESS*\n" +
        "\n" +
        "• Status: berhasil join grup\n" +
        "• Code: `" +
        code +
        "`\n" +
        "• Group ID: `" +
        (result || "-") +
        "`",
    );
  } catch (err) {
    console.error("[joingc]", err);
    return m.reply(
      "*JOINGC FAILED*\n" + "\n" + "• Error: `" + (err?.message || err) + "`",
    );
  }
}

async function leaveGcHandler(conn, m) {
  try {
    if (!m.isGroup) {
      return m.reply(
        "*LEAVEGC ERROR*\n" +
          "\n" +
          "• Perintah ini hanya bisa dipakai di dalam grup",
      );
    }

    await m.reply(
      "*LEAVEGC PROCESS*\n" + "\n" + "• Bot akan keluar dari grup ini",
    );

    await conn.groupLeave(m.chat);
  } catch (err) {
    console.error("[leavegc]", err);
    return m.reply(
      "*LEAVEGC FAILED*\n" + "\n" + "• Error: `" + (err?.message || err) + "`",
    );
  }
}

async function starHandler(conn, m) {
  try {
    if (!m.quoted?.key?.id) {
      return m.reply(
        "*STAR ERROR*\n" + "\n" + "• Reply pesan yang ingin di-star",
      );
    }

    await conn.chatModify(
      {
        star: {
          messages: [
            {
              id: m.quoted.key.id,
              fromMe: m.quoted.key.fromMe || false,
            },
          ],
          star: true,
        },
      },
      m.chat,
    );

    return m.reply("*STAR SUCCESS*\n" + "\n" + "• Pesan berhasil di-star");
  } catch (err) {
    console.error("[star]", err);
    return m.reply(
      "*STAR FAILED*\n" + "\n" + "• Error: `" + (err?.message || err) + "`",
    );
  }
}

async function unstarHandler(conn, m) {
  try {
    if (!m.quoted?.key?.id) {
      return m.reply(
        "*UNSTAR ERROR*\n" + "\n" + "• Reply pesan yang ingin di-unstar",
      );
    }

    await conn.chatModify(
      {
        star: {
          messages: [
            {
              id: m.quoted.key.id,
              fromMe: m.quoted.key.fromMe || false,
            },
          ],
          star: false,
        },
      },
      m.chat,
    );

    return m.reply("*UNSTAR SUCCESS*\n" + "\n" + "• Pesan berhasil di-unstar");
  } catch (err) {
    console.error("[unstar]", err);
    return m.reply(
      "*UNSTAR FAILED*\n" + "\n" + "• Error: `" + (err?.message || err) + "`",
    );
  }
}

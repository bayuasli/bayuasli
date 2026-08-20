import { parsePhoneNumber } from "awesome-phonenumber";

export default {
  name: "owner",
  category: "info",
  command: ["own", "owner"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const number = "628895307489";
    const name = "sbyuxD !";
    const njid = number + "@s.whatsapp.net";

    const biz = (await conn.getBusinessProfile(njid).catch(() => null)) || {};
    const parsed = parsePhoneNumber("+" + number);

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:;${name.replace(/\n/g, "\\n")};;;`,
      `FN:${name.replace(/\n/g, "\\n")}`,
      `TEL;type=CELL;type=VOICE;waid=${number}:${parsed.number?.international || number}`,
    ];

    if (biz.description) {
      lines.push(
        `X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/g, "\\n")}`,
      );
      lines.push(
        `X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, "\\n")}`,
      );
    }

    lines.push("END:VCARD");

    await conn.sendMessage(
      m.chat,
      {
        contacts: {
          displayName: name,
          contacts: [{ vcard: lines.join("\n"), displayName: name }],
        },
      },
      { quoted: m },
    );
  },
};

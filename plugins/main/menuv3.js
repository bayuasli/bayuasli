import moment from "moment-timezone";

function getTimeGreeting() {
  const hour = moment().tz("Asia/Jakarta").hour();
  if (hour >= 2 && hour < 10) return { greeting: "Pagi", emoji: "🌤️" };
  if (hour >= 10 && hour < 15) return { greeting: "Siang", emoji: "☀️" };
  if (hour >= 15 && hour < 18) return { greeting: "Sore", emoji: "🌅" };
  return { greeting: "Malam", emoji: "🌃" };
}

export default {
  name: "menuv2",
  category: "main",
  command: ["menuv3", "h3", "m3"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    const start = performance.now();

    await conn.sendMessage(m.chat, { react: { text: "🙄", key: m.key } });

    const uptime = Func.runtime(process.uptime());
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const timeNow = moment().tz("Asia/Jakarta");
    const time = timeNow.format("HH:mm:ss");

    const { greeting, emoji } = getTimeGreeting();
    const fullGreeting = `Halo Kak ${m.pushname || "User"}, Selamat ${greeting} ${emoji}`;

    const grouped = {};
    for (const plugin of Object.values(global.plugins || {})) {
      if (!plugin.category) continue;
      if (!grouped[plugin.category]) grouped[plugin.category] = [];
      grouped[plugin.category].push(plugin.name);
    }

    const speed = (performance.now() - start).toFixed(2);

    let footer =
      `⎯⟢ ⚝ *INFO BOT* ⚝ ⟣⎯\n` +
      `╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n` +
      `╎⟜⟞ *⌬ User* : ${m.pushname || "User"}\n` +
      `╎⟜⟞ *⌬ Mode* : ${global.IS_PUBLIC ? "PUBLIC" : "SELF"}\n` +
      `╎⟜⟞ *⌬ Speed* : ${speed} ms\n` +
      `╎⟜⟞ *⌬ RAM* : ${ram} MB\n` +
      `╎⟜⟞ *⌬ Uptime* : ${uptime}\n` +
      `╎⟜⟞ *⌬ Time* : ${time}\n` +
      `╎⟜⟞ *⌬ Action* : ẉ.ceo/Z3PH\n` +
      `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n` +
      `⟡─────────୨ৎ────────⟡\n\n`;

    for (const [category, items] of Object.entries(grouped)) {
      footer += `⎯⟢ ⚝ *${category.toUpperCase()}* ⚝ ⟣⎯\n`;
      footer += ` ╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n`;
      for (const item of items) {
        footer += `╎⟜⟞ *⌬ ${item}*\n`;
      }
      footer += `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n`;
      footer += `⟡─────────୨ৎ────────⟡\n\n`;
    }

    footer +=
      `Total Categories : ${Object.keys(grouped).length}\n` +
      `Total Features   : ${Object.values(grouped).flat().length}\n\n` +
      `⋰──────────────────⋱\n` +
      `       *Creator : ${global.nameown || "sbyuxD"}*\n` +
      `       *Bot Name: ${global.namebotz || "Z3PH BOT"}*\n` +
      `⋰──────────────────⋱`;

    try {
      const content = {
        interactiveMessage: {
          header: {
            hasMediaAttachment: true,
            locationMessage: {
              degreesLatitude: 35.67657,
              degreesLongitude: 139.762148,
              name: global.namebotz || "Z3PH BOT",
              address: time,
            },
          },
          body: { text: fullGreeting },
          footer: { text: footer.trim() },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  has_multiple_buttons: true,
                }),
              },
              {
                name: "call_permission_request",
                buttonParamsJson: JSON.stringify({
                  has_multiple_buttons: true,
                }),
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Menu Bot",
                  id: ".menu",
                }),
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "yth.Z3PH",
                  id: "owner",
                }),
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "Saluran",
                  url: "https://whatsapp.com/channel/0029VbCbo6V89inbHHxprE19",
                }),
              },
            ],
            messageParamsJson: JSON.stringify({
              bottom_sheet: {
                in_thread_buttons_limit: 2,
                divider_indices: [1, 2, 3, 4, 5, 999],
                list_title: global.namebotz || "Z3PH BOT",
                button_title: "𖤍",
              },
              tap_target_configuration: {
                title: "▸ X ◂",
                description: "world",
                canonical_url: "",
                domain: "shop.example.com",
                button_index: 0,
              },
            }),
          },
        },
      };

      const relayOptions = {
        messageId: "SBYUXD" + Date.now(),
        additionalNodes: [
          {
            tag: "biz",
            attrs: {},
            content: [
              {
                tag: "interactive",
                attrs: { type: "native_flow", v: "1" },
                content: [
                  { tag: "native_flow", attrs: { v: "9", name: "mixed" } },
                ],
              },
            ],
          },
        ],
      };

      await conn.relayMessage(m.chat, content, relayOptions);
    } catch (err) {
      console.error("[menuv2]", err.message);
      return m.reply(fullGreeting + "\n\n" + footer.trim());
    }
  },
};

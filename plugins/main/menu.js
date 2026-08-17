import moment from "moment-timezone";
import { AIRich } from "#helper";

function getTimeGreeting() {
  const hour = moment().tz("Asia/Jakarta").hour();
  let greeting, emoji;
  if (hour >= 2 && hour < 10) {
    greeting = "Pagi";
    emoji = "🌤️";
  } else if (hour >= 10 && hour < 15) {
    greeting = "Siang";
    emoji = "☀️";
  } else if (hour >= 15 && hour < 18) {
    greeting = "Sore";
    emoji = "🌅";
  } else {
    greeting = "Malam";
    emoji = "🌃";
  }
  return { greeting, emoji };
}

export default {
  name: "menu",
  category: "main",
  command: ["menu", "allmenu", "help"],
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
      `⎯⟢ ⚝ INFO BOT ⚝ ⟣⎯\n` +
      `╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n` +
      `╎⟜⟞ ⌬ User : ${m.pushname || "User"}\n` +
      `╎⟜⟞ ⌬ Mode : ${global.IS_PUBLIC ? "PUBLIC" : "SELF"}\n` +
      `╎⟜⟞ ⌬ Speed : ${speed} ms\n` +
      `╎⟜⟞ ⌬ RAM : ${ram} MB\n` +
      `╎⟜⟞ ⌬ Uptime : ${uptime}\n` +
      `╎⟜⟞ ⌬ Time : ${time}\n` +
      `╎⟜⟞ ⌬ Action : ẉ.ceo/Z3PH\n` +
      `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n` +
      `⟡─────────୨ৎ────────⟡\n\n`;

    for (const [category, items] of Object.entries(grouped)) {
      footer += `⎯⟢ ⚝ ${category.toUpperCase()} ⚝ ⟣⎯\n`;
      footer += ` ╭⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╮\n`;
      for (const item of items) {
        footer += `╎⟜⟞ ⌬ ${item}\n`;
      }
      footer += `╰⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘╯\n`;
      footer += `⟡─────────୨ৎ────────⟡\n\n`;
    }

    footer +=
      `Total Categories : ${Object.keys(grouped).length}\n` +
      `Total Features   : ${Object.values(grouped).flat().length}\n\n` +
      `⋰──────────────────⋱\n` +
      `       Creator : ${global.nameown || "sbyuxD"}\n` +
      `       Bot Name: ${global.namebotz || "Z3PH BOT"}\n` +
      `⋰──────────────────⋱`;

    try {
      await new AIRich(conn)
        .setTitle("🥶 MENU Z3PHWOLF !")
        .setFooter("© sbyuxD")
        .addSuggest("Z3PHRINE BOT")
        .addSuggest(["sbyuxD", "Z3PHRINE", "LISTMENU ", "Z3PH BOT"])
        .addTip(fullGreeting)
        .addText(
          `
# #–스뷰 ZEPHRINE BOT

---

[Z3PHRINE](!https://t.me/Z3PHRINE)
	`,
        )
        .addProduct({
          title: " sbyuxD",
          brand: "Whatsapp",
          price: "Rp 5555",
          sale_price: "Rp 999",
          url: "https://wa.me/6288228819127",
          image:
            "https://raw.githubusercontent.com/sbyuxD/sbyuxd-uploader/main/uploads/90fe1b-1785575792638.jpg",
        })
        .addProduct(
          Array(1).fill({
            title: " sbyuxD",
            brand: "Z3PHRINE",
            price: "Rp 9999",
            sale_price: "Rp 5555",
            url: "https://wa.me/6288228819127",
            image: "https://img2.pixhost.to/images/9264/748305427_sbyuxd.jpg",
          }),
        )
        .addTable([
          ["Nama", "role"],
          [
            `[${m.pushname || "User"}](https://wa.me/${m.sender.split("@")[0]})`,
            "member dari ngawi",
          ],
          [" sbyuxD", "Developer"],
        ])
        .addCode(
          "javascript",
          `class Developer {
	static info() {
		return {
			name: 'sbyuxD',
			role: 'Full Stuck Ey Ay',
			skills: ['ISSUE'],
			status: 'MEMBER KKN'
		};
	}

	static hello() {
		return 'Hello, ${m.pushname || "User"}, Selamat bersenang senang';
	}
}`,
        )
        .addSource([
          [
            "https://img2.pixhost.to/images/9241/748114493_sbyuxd.jpg",
            "https://github.com/sbyuxD/",
            "GitHub",
          ],
          [
            "https://img2.pixhost.to/images/9264/748304653_sbyuxd.jpg",
            "https://wa.me/6288228819127",
            "Whatsapp",
          ],
        ])
        .addTip(footer.trim())
        .send(m.chat, { quoted: m });
    } catch (err) {
      console.error("[menu]", err);
      return m.reply(fullGreeting + "\n\n" + footer.trim());
    }
  },
};

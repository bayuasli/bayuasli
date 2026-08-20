import { translateText, langMap } from "#scrape/translate.js";

export default {
  name: "translate",
  category: "tools",
  command: ["tr", "translate"],
  alias: ["tl"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const args = m.args || [];
    const quoted = m.quoted || m.q;
    const quotedText = quoted?.body || quoted?.text || "";

    let toLang = "id";
    let textToTranslate = "";

    if (args.length > 0) {
      const firstWord = args[0].toLowerCase();

      if (langMap[firstWord]) {
        toLang = firstWord;
        textToTranslate = args.slice(1).join(" ") || quotedText;
      } else {
        toLang = "id";
        textToTranslate = args.join(" ");
      }
    } else if (quotedText) {
      toLang = "id";
      textToTranslate = quotedText;
    }

    if (!textToTranslate.trim()) {
      const popularLangs = [
        "id (Indonesia)", "en (Inggris)", "ja (Jepang)", "ko (Korea)",
        "ar (Arab)", "zh (Mandarin)", "jw (Jawa)", "su (Sunda)",
        "fr (Prancis)", "de (Jerman)", "es (Spanyol)", "ru (Rusia)"
      ];

      return m.reply(
        `*GOOGLE TRANSLATE*\n\n` +
          `*Cara Penggunaan*:\n` +
          `• \`.tr <teks>\` (Auto ke Indonesia)\n` +
          `• \`.tr <kode_bahasa> <teks>\`\n` +
          `• Reply pesan lalu ketik \`.tr <kode_bahasa>\`\n\n` +
          `*Contoh*:\n` +
          `• \`.tr hello world\`\n` +
          `• \`.tr en halo dunia\`\n` +
          `• \`.tr ja selamat pagi\`\n\n` +
          `*Kode Populer*:\n${popularLangs.map((l) => `• \`${l}\``).join("\n")}`
      );
    }

    try {
      const res = await translateText(textToTranslate, toLang);

      const responseText =
        `*TRANSLATE RESULT*\n\n` +
        `• *Dari* : \`${res.sourceLangName} (${res.detectedLang})\` \n` +
        `• *Ke*   : \`${res.targetLangName} (${toLang})\` \n\n` +
        `${res.result}`;

      return m.reply(responseText);
    } catch (err) {
      return m.reply("Gagal menerjemahkan teks: " + err.message);
    }
  },
};
import axios from "axios";

async function translate(text, to, from = "auto") {
  const { data } = await axios.get(
    "https://translate.googleapis.com/translate_a/single",
    {
      params: {
        client: "gtx",
        sl: from,
        tl: to,
        dt: "t",
        q: text,
      },
    },
  );

  const result = data[0]
    ?.map((s) => s?.[0])
    .filter(Boolean)
    .join("");
  const detectedLang = data[2] || from;

  return { result, detectedLang };
}

const langMap = {
  id: "Indonesia",
  en: "Inggris",
  ja: "Jepang",
  ko: "Korea",
  zh: "Mandarin",
  ar: "Arab",
  fr: "Prancis",
  de: "Jerman",
  es: "Spanyol",
  it: "Italia",
  pt: "Portugis",
  ru: "Rusia",
  tr: "Turki",
  th: "Thailand",
  vi: "Vietnam",
  ms: "Melayu",
  nl: "Belanda",
  pl: "Polandia",
  sv: "Swedia",
  hi: "Hindi",
};

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
    const args = m.args;
    const q = m.isQuoted ? m.quoted : null;

    if (!args.length) {
      return m.reply(
        "*Auto Translate*\n\n" +
          "Format:\n" +
          "*tr <kode bahasa> <teks>*\n" +
          "*tr <kode bahasa>* (reply pesan)\n\n" +
          "*Kode bahasa:*\n" +
          Object.entries(langMap)
            .map(([k, v]) => `${k} — ${v}`)
            .join("\n"),
      );
    }

    const to = args[0].toLowerCase();
    if (!langMap[to]) {
      return m.reply(
        `Kode bahasa *${to}* tidak dikenali.\n\nKetik *tr* untuk melihat daftar kode bahasa.`,
      );
    }

    const text =
      args.slice(1).join(" ") ||
      q?.msg?.caption ||
      q?.msg?.text ||
      q?.msg?.conversation ||
      q?.body ||
      "";

    if (!text) {
      return m.reply(
        "Masukkan teks atau reply pesan yang ingin diterjemahkan.\nContoh: *tr en halo dunia*",
      );
    }

    const { result, detectedLang } = await translate(text, to);

    return m.reply(
      `*Translate*\n\n` +
        `Dari : ${langMap[detectedLang] || detectedLang}\n` +
        `Ke   : ${langMap[to]}\n\n` +
        `${result}`,
    );
  },
};

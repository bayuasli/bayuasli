export default {
  name: "lang",
  category: "owner",
  command: ["lang", "setlang", "language"],
  settings: {
    owner: true,
  },
  run: async (conn, m) => {
    const Lang = Object.keys(lang.languages).join(", ");
    if (!m.text) return m.reply(`Enter the language ID (${Lang})`);

    try {
      global.lang.setLanguage(m.text);

      if (global.lang.defaultLang === m.text) {
        m.reply(`✅ Language successfully changed to: ${m.text}`);
      } else {
        m.reply(`❌ Language '${m.text}' not found. Available: ${Lang}`);
      }
    } catch (e) {
      m.reply(`❌ Error: ${String(e)}`);
    }
  },
};

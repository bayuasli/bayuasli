export default {
  name: "shortlink",
  category: "tools",
  command: ["shortlink", "short", "shorturl"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Func }) => {
    try {
      const input = m.text.trim();
      if (!input)
        return m.reply(
          "Masukkan URL.\nContoh:\n.short https://example.com\n.short https://example.com | aliassaya",
        );

      const [rawUrl, rawAlias] = input.split("|").map((s) => s.trim());

      if (!rawUrl.startsWith("http"))
        return m.reply("URL harus diawali dengan http:// atau https://");

      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(rawUrl)}${rawAlias ? "&alias=" + encodeURIComponent(rawAlias) : ""}`;
      const res = await Func.fetchJson(apiUrl);

      if (!res || res === "Error")
        throw new Error(
          "Custom alias sudah dipakai orang lain. Coba nama lain.",
        );

      const teks = `*Short Link Berhasil*\n\nURL Asli : ${rawUrl}${rawAlias ? "\nAlias    : " + rawAlias : ""}\nHasil    : ${res}`;

      await conn.sendMessage(m.chat, { text: teks }, { quoted: m });
      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      await m.reply("Error: " + e.message);
    }
  },
};

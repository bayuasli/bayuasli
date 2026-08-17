export default {
  name: "jsenc",
  category: "encrypt",
  command: ["obf", "obfuscate"],
  alias: ["protect"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    try {
      let input = "";

      if (m.isQuoted && m.quoted?.body) {
        input = m.quoted.body;
      } else if (m.text) {
        input = m.text;
      } else {
        return m.reply("Kirim atau reply kode JavaScript.");
      }

      function sbyuxdProtect(code) {
        let res = code;
        let vcnt = 0;
        let fcnt = 0;
        const map = {};

        res = res.replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (m, n) => {
          if (!map[n])
            map[n] =
              "_0x" +
              (++fcnt).toString(16) +
              Math.random().toString(36).slice(2, 6);
          return "function " + map[n];
        });

        res = res.replace(
          /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
          (m, kw, n) => {
            if (!map[n])
              map[n] =
                "_0x" +
                (++vcnt).toString(16) +
                Math.random().toString(36).slice(2, 6);
            return kw + " " + map[n];
          },
        );

        for (const old in map) {
          const neu = map[old];
          const r = new RegExp("\\b" + old + "\\b", "g");
          res = res.replace(r, neu);
        }

        res = res.replace(/\s+/g, " ");
        res = res.replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, "$1");

        const strs = [];
        res = res.replace(/'([^']*)'/g, (m, s) => {
          strs.push(s);
          return "'__STR_" + (strs.length - 1) + "__'";
        });

        res = res.replace(/"([^"]*)"/g, (m, s) => {
          strs.push(s);
          return '"__STR_' + (strs.length - 1) + '__"';
        });

        strs.forEach((s, i) => {
          const enc = Buffer.from(s).toString("base64");
          res = res.replace("__STR_" + i + "__", '"' + enc + '"');
        });

        return res;
      }

      const result = sbyuxdProtect(input);

      if (result.length > 60000) {
        return m.reply("Hasil terlalu panjang.");
      }

      await m.reply(result);
    } catch (e) {
      await m.reply("Terjadi error saat obfuscate.");
    }
  },
};

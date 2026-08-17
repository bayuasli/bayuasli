import {
  qtext,
  metaai,
  pixx,
  pay,
  pack,
  poll,
  vn,
  gif,
  gc,
  video,
  loc,
  kontak,
  salr,
  order,
} from "#lib/quoted.js";

const presets = {
  qtext,
  metaai,
  pixx,
  pay,
  pack,
  poll,
  vn,
  gif,
  gc,
  video,
  loc,
  kontak,
  salr,
  order,
};

export default {
  name: "fakequoted",
  category: "owner",
  command: ["fq"],
  settings: {
    owner: true,
    loading: false,
  },

  run: async (conn, m) => {
    const sub = m.args[0]?.toLowerCase();

    if (!sub || sub === "list") {
      const list = Object.keys(presets)
        .map((k, i) => `${i + 1}. ${k}`)
        .join("\n");
      return m.reply(
        `*List Fake Quoted*\n\n${list}\n\nCara pakai: .fq get <nama>\nContoh: .fq get poll`,
      );
    }

    if (sub === "get") {
      const name = m.args[1]?.toLowerCase();
      if (!name) return m.reply("Masukkan nama preset.\nContoh: .fq get poll");

      const preset = presets[name];
      if (!preset)
        return m.reply(
          `Preset *${name}* tidak ditemukan.\nKetik .fq list untuk melihat daftar.`,
        );

      await conn.sendMessage(
        m.chat,
        { text: m.body || "." },
        { quoted: preset },
      );
      return;
    }

    return m.reply(
      "Subcommand tidak dikenal.\n.fq list → lihat daftar\n.fq get <nama> → kirim preset",
    );
  },
};

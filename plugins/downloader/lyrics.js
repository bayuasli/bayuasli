import { searchSongs, getLyrics } from "#scrape/genius.js";
import { Button } from "#helper";

const searchCache = new Map();

export default {
  name: "lyrics",
  category: "downloader",
  command: ["lirik", "lyrics", "lyricsget"],
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
    if (m.command === "lirik" || m.command === "lyrics") {
      const query = (m.text || "").trim();
      if (!query)
        return m.reply(`Contoh:\n${m.prefix}lirik judul lagu / penyanyi`);

      const songs = await searchSongs(query);
      if (songs.length === 0) return m.reply("Lagu tidak ditemukan.");

      const top = songs.slice(0, 8);
      searchCache.set(m.sender, top);

      const btn = new Button(conn)
        .setTitle("Hasil Pencarian Lirik")
        .setBody(`Ditemukan ${top.length} lagu untuk "${query}"`)
        .setFooter("Genius Lyrics")
        .addSelection("Pilih Lagu", {})
        .makeSection("Hasil Pencarian");

      top.forEach((song, i) => {
        btn.makeRow(
          "",
          song.title,
          `${song.artist}${song.release_date ? ` · ${song.release_date}` : ""}`,
          `${m.prefix}lyricsget ${i + 1}`,
        );
      });

      return btn.send(m.chat, { quoted: m });
    }

    if (m.command === "lyricsget") {
      const idx = parseInt(m.text) - 1;
      const songs = searchCache.get(m.sender);

      if (!songs)
        return m.reply(
          "Sesi pencarian sudah habis, cari ulang dengan `.lirik <judul>`.",
        );
      if (isNaN(idx) || !songs[idx]) return m.reply("Pilihan tidak valid.");

      const song = songs[idx];
      const lyrics = await getLyrics(song.path);

      if (!lyrics) return m.reply("Gagal mengambil lirik untuk lagu ini.");

      const trimmed =
        lyrics.length > 3500
          ? lyrics.slice(0, 3500) + "\n\n... (dipotong)"
          : lyrics;

      const text =
        `*${song.title}*\n` +
        `Artis: ${song.artist}\n` +
        `Rilis: ${song.release_date || "-"}\n\n` +
        `${trimmed}`;

      return m.reply(text);
    }
  },
};

import { search, getDownloadLinks } from "#scrape/soundcloud.js";

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal mengunduh audio dari CDN SoundCloud.");
  return Buffer.from(await res.arrayBuffer());
}

export default {
  name: "soundcloud",
  category: "downloader",
  command: ["sc", "soundcloud", "scdl"],
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
    const input = (m.text || "").trim();

    if (!input) {
      return m.reply(
        `Contoh:\n${m.prefix}sc judul lagu\natau\n${m.prefix}sc https://soundcloud.com/artist/track`,
      );
    }

    try {
      const result = await search(input);
      const track = result.tracks?.[0];

      if (!track) return m.reply("Track tidak ditemukan.");

      const links = await getDownloadLinks(track.media, result.clientId);
      if (!links.mp3)
        return m.reply("Gagal mendapat link stream audio untuk track ini.");

      await m.reply(
        `*SOUNDCLOUD*\n\n` +
          `Judul: ${track.title}\n` +
          `Artist: ${track.artist}\n` +
          `URL: ${track.url}\n\n` +
          `Mengunduh...`,
      );

      const audioBuffer = await fetchBuffer(links.mp3);
      const title = track.title?.slice(0, 60) || "SoundCloud Track";

      await conn.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`,
        },
        { quoted: m },
      );
    } catch (err) {
      console.error("[soundcloud]", err);
      return m.reply("Terjadi kesalahan: " + err.message);
    }
  },
};

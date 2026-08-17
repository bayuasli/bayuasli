import { spotifyDownload } from '#scrape/spotifydl.js';

export default {
  name: 'spotifydl',
  category: 'downloader',
  command: ['spotifydl', 'spdl', 'spotdl'],
  alias: ['spotify'],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m) => {
    try {
      const url = m.text.trim();
      if (!url) {
        return m.reply(
          'Spotify Downloader\n\n' +
          'Usage: .spotifydl <url>\n' +
          'Contoh: .spotifydl https://open.spotify.com/track/xxx'
        );
      }

      if (!url.includes('open.spotify.com/track/')) {
        return m.reply('Masukkan link track Spotify yang valid.');
      }

      await m.reply('Mengambil audio...');

      const result = await spotifyDownload(url);

      const audioRes = await fetch(result.download);
      if (!audioRes.ok) throw new Error('Gagal download audio');
      
      const buffer = Buffer.from(await audioRes.arrayBuffer());

      await conn.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: result.title + '.mp3',
        ptt: false
      }, { quoted: m });

    } catch (err) {
      console.error('SpotifyDL Error:', err);
      return m.reply('Error: ' + err.message);
    }
  }
};
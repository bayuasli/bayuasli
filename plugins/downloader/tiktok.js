import { tiktokDownload } from '#scrape/tiktok.js';

export default {
  name: 'tiktok',
  category: 'downloader',
  command: ['tiktok', 'tt', 'tiktokdl', 'ttdl'],
  alias: ['ttdl'],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m) => {
    let url = m.text.trim();
    if (!url && m.isQuoted) {
      url = m.quoted.text || m.quoted.body || '';
    }
    if (!url) {
      return m.reply(
        'TikTok Downloader\n\n' +
        'Usage:\n' +
        '.tt <link>\n' +
        'Atau reply pesan yang berisi link TikTok\n\n' +
        'Contoh:\n' +
        '.tt https://vt.tiktok.com/xxx'
      );
    }

    const linkMatch = url.match(/(https?:\/\/(vt|vm|www\.)?tiktok\.com\/[^\s]+)/);
    if (!linkMatch) {
      return m.reply('Link TikTok tidak valid');
    }

    try {
      await m.reply('Mengambil data...');

      const result = await tiktokDownload(linkMatch[0]);

      if (!result.download || result.download.length === 0) {
        return m.reply('Tidak ada media yang bisa diunduh');
      }

      const caption =
        'TIKTOK\n\n' +
        'Judul: ' + (result.title || 'Tidak ada') + '\n' +
        'Author: ' + (result.author?.username || 'Unknown') + '\n' +
        'Like: ' + (result.stats?.like || 0) + '\n' +
        'Views: ' + (result.stats?.views || 0);

      for (const mediaUrl of result.download) {
        try {
          const mediaRes = await fetch(mediaUrl);
          const buffer = Buffer.from(await mediaRes.arrayBuffer());

          if (result.isVideo) {
            await conn.sendMessage(m.chat, {
              video: buffer,
              caption: caption,
              mimetype: 'video/mp4'
            }, { quoted: m });
          } else {
            await conn.sendMessage(m.chat, {
              image: buffer,
              caption: caption
            }, { quoted: m });
          }
          break;
        } catch (err) {
          continue;
        }
      }

    } catch (err) {
      console.error('TikTok Error:', err);
      return m.reply('Error: ' + err.message);
    }
  }
};
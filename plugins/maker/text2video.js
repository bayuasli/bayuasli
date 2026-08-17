import { getDeviceId, getToken, generateVideo, resetDevice } from '#scrape/t2v.js';

export default {
  name: 'text2video',
  category: 'maker',
  command: ['txt2video', 't2v', 'txt2vid'],
  alias: ['text2vid'],
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
      const prompt = m.text.trim();
      if (!prompt) {
        return m.reply(
          'Text to Video\n\n' +
          'Usage: .t2v <prompt>\n' +
          'Contoh: .t2v a beautiful sunset over the ocean\n\n' +
          'Max 500 karakter'
        );
      }

      if (prompt.length > 500) {
        return m.reply('Prompt maksimal 500 karakter.');
      }

      await m.reply('Generate video...\nPrompt: ' + prompt);

      const deviceId = getDeviceId();
      const token = await getToken(deviceId);

      const buffer = await generateVideo(prompt, deviceId, token);

      await conn.sendMessage(m.chat, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: 'video.mp4',
        caption: 'Prompt: ' + prompt
      }, { quoted: m });

    } catch (err) {
      console.error('T2V Error:', err);
      if (err.message.includes('429') || err.message.includes('limit')) {
        resetDevice();
        return m.reply('Kuota habis, device direset. Coba lagi.');
      }
      return m.reply('Error: ' + err.message);
    }
  }
};
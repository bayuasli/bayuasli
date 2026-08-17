import { premiumChat } from '#scrape/premiumai.js';

export default {
  name: 'premiumai',
  category: 'ai',
  command: ['premiumai', 'pai'],
  alias: ['pai'],
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
      if (!m.text) {
        return m.reply('Premium AI\n\nUsage: .premiumai <question>');
      }

      let q = m.text;
      const options = {};

      if (m.text.includes('|')) {
        const parts = m.text.split('|').map(s => s.trim());
        q = parts[0];
        const flags = parts.slice(1).join(' ').toLowerCase();
        if (flags.includes('image')) options.text2image = true;
        if (flags.includes('search')) options.search = true;
        if (flags.includes('think')) options.thinking = true;
      }

      const result = await premiumChat(q, options);

      if (!result.status) {
        return m.reply('Error: ' + (result.error || 'Unknown'));
      }

      const answer = result.result?.answer || result.result || 'Tidak ada respons';

      const responseText = answer.length > 4096
        ? answer.slice(0, 4096) + '\n\n... (pesan terpotong)'
        : answer;

      return m.reply('Premium AI\n\n' + responseText);
    } catch (err) {
      console.error('Premium AI Error:', err);
      return m.reply('Error: ' + err.message);
    }
  }
};
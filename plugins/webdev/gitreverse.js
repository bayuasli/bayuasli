import { webtoprompt, repotoprompt } from '#scrape/gitreverse.js';

export default {
  name: 'gitreverse',
  category: 'webdev',
  command: ['gitreverse', 'gr'],
  alias: [],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m) => {
    const input = m.text.trim();
    if (!input) {
      return m.reply(
        'GitReverse AI Prompt\n\n' +
        'Usage:\n' +
        '.gr <url> - generate prompt dari website\n' +
        '.gr <owner/repo> - generate prompt dari repo\n\n' +
        'Contoh:\n' +
        '.gr https://github.com/user/repo\n' +
        '.gr user/repo'
      );
    }

    try {
      await m.reply('Menggenerate prompt AI...');

      let result;
      if (input.includes('github.com') || /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input)) {
        result = await repotoprompt(input);
      } else {
        const url = input.startsWith('http') ? input : 'https://' + input;
        result = await webtoprompt(url);
      }

      const responseText = result.prompt.length > 4096
        ? result.prompt.slice(0, 4096) + '\n\n... (pesan terpotong)'
        : result.prompt;

      return m.reply('PROMPT AI\n\n' + responseText);
    } catch (err) {
      console.error('GitReverse Error:', err);
      return m.reply('Error: ' + err.message);
    }
  }
};
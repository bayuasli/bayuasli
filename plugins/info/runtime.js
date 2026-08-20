export default {
  name: "runtime",
  category: "info",
  command: ["runtme"],
  alias: ["rt"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, { Api, Func }) => {
    try {
      const os = await import("os");
      const processUptime = process.uptime();
      const osType = os.type();
      const osUptime = os.uptime();
      const botUptime = processUptime;
      const vpsUptime = osUptime;

      const formatTime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
      };

      const infoText = `
*RUNTIME INFO*
> OS: ${osType}
> OS Uptime: ${formatTime(osUptime)}
> Bot Uptime: ${formatTime(botUptime)}
> VPS Uptime: ${formatTime(vpsUptime)}
      `;

      await m.reply(infoText);
    } catch (err) {
      await m.reply("Gagal mengambil informasi bot.");
    }
  },
};

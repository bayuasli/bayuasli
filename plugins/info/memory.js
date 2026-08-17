function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default {
  name: "memory",
  category: "info",
  command: ["memory", "ram", "mem"],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const mem = process.memoryUsage();

    const text =
      `*── 「 MEMORY USAGE 」 ──*\n\n` +
      `◦ *rss:* ${formatMb(mem.rss)}\n` +
      `◦ *heapTotal:* ${formatMb(mem.heapTotal)}\n` +
      `◦ *heapUsed:* ${formatMb(mem.heapUsed)}\n` +
      `◦ *external:* ${formatMb(mem.external)}\n` +
      `◦ *arrayBuffers:* ${formatMb(mem.arrayBuffers || 0)}`;

    return m.reply(text);
  },
};
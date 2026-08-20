import os from "os";
import process from "process";
import v8 from "v8";

function toGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function formatDuration(seconds) {
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const out = [];
  if (d) out.push(d + "d");
  if (h) out.push(h + "h");
  if (m) out.push(m + "m");
  out.push(s + "s");
  return out.join(" ");
}

export default {
  name: "serverinfo",
  category: "info",
  command: ["sinfo", "infoserver", "infos"],
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
    try {
      const cpus = os.cpus();
      const cpu = cpus[0];
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const heapStats = v8.getHeapStatistics();

      const msg = [
        "🖥️ *SERVER INFORMATION*",
        "",
        "*Hardware*",
        "• CPU : " + (cpu?.model ?? "Unknown"),
        "• Core : " + (cpus.length || "Unknown"),
        "• Clock : " + (cpu?.speed ? cpu.speed + " MHz" : "Unknown"),
        "• Architecture : " + os.arch(),
        "• Endianness : " + os.endianness(),
        "",
        "*Memory*",
        "• Total : " + toGB(totalMem),
        "• Used : " + toGB(usedMem),
        "• Free : " + toGB(freeMem),
        "",
        "*Operating System*",
        "• Platform : " + os.platform(),
        "• Type : " + os.type(),
        "• Release : " + os.release(),
        "• Hostname : " + os.hostname(),
        "• Uptime : " + formatDuration(os.uptime()),
        "",
        "*Runtime*",
        "• Node.js : " + process.version,
        "• V8 : " + process.versions.v8,
        "• PID : " + process.pid,
        "• Architecture : " + process.arch,
        "• Heap Limit : " + toGB(heapStats.heap_size_limit),
        "",
        "*Process Memory*",
        "• RSS : " + toMB(process.memoryUsage().rss),
        "• Heap Used : " + toMB(process.memoryUsage().heapUsed),
        "• Heap Total : " + toMB(process.memoryUsage().heapTotal),
        "• External : " + toMB(process.memoryUsage().external),
      ].join("\n");

      return m.reply(msg);
    } catch (e) {
      console.error("[serverinfo]", e);
      return m.reply("Error: " + e.message);
    }
  },
};

import os from "os";
import v8 from "v8";
import { performance } from "perf_hooks";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

async function measureEventLoopLag() {
  const start = process.hrtime.bigint();
  return new Promise((resolve) => {
    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      resolve((Number(delta) / 1e6).toFixed(2));
    });
  });
}

function runBenchmark() {
  const start = performance.now();
  let x = 0;
  for (let i = 0; i < 1e6; i++) {
    x += Math.sqrt(i) * Math.sin(i);
  }
  const end = performance.now();
  return (end - start).toFixed(2);
}

export default {
  name: "perfmon",
  category: "core",
  command: ["perf", "perfmon", "health", "syscheck"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const sub = (m.args[0] || "").toLowerCase();

    if (sub === "bench" || sub === "test") {
      const lag = await measureEventLoopLag();
      const cpuBench = runBenchmark();

      const text =
        `*SYSTEM PERFORMANCE BENCHMARK*\n\n` +
        `• *Event Loop Lag* : \`${lag} ms\`\n` +
        `• *CPU 1M Math Ops* : \`${cpuBench} ms\`\n` +
        `• *Event Loop Health* : \`${parseFloat(lag) < 20 ? "Optimal (Sangat Cepat)" : "Tinggi (Ada Beban/Blocking)"}\`\n\n` +
        `Status performa thread bot saat ini stabil dan responsif.`;

      return m.reply(text);
    }

    if (sub === "opt" || sub === "optimize") {
      const before = process.memoryUsage().heapUsed;

      if (typeof global.gc === "function") {
        try {
          global.gc();
        } catch {}
      }

      const after = process.memoryUsage().heapUsed;
      const freed = Math.max(0, before - after);

      const text =
        `*SYSTEM OPTIMIZATION COMPLETED*\n\n` +
        `• *RAM Dibebaskan* : \`${formatBytes(freed)}\`\n` +
        `• *Heap Saat Ini*   : \`${formatBytes(after)}\`\n` +
        `• *Status GC*       : \`${typeof global.gc === "function" ? "Active" : "Disabled (Jalankan Node dengan --expose-gc)"}\``;

      return m.reply(text);
    }

    const lag = await measureEventLoopLag();
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    const load = os.loadavg().map((n) => n.toFixed(2));
    const activeHandles = process._getActiveHandles?.()?.length || 0;
    const activeRequests = process._getActiveRequests?.()?.length || 0;

    const heapFragmentation = ((1 - mem.heapUsed / mem.heapTotal) * 100).toFixed(1);
    const heapUsagePercent = ((mem.heapUsed / heap.heap_size_limit) * 100).toFixed(1);

    const text =
      `*SYSTEM & BOT PERFORMANCE MONITOR*\n\n` +
      `*ENGINE & EVENT LOOP*\n` +
      `• *Event Loop Lag* : \`${lag} ms\` (${parseFloat(lag) < 15 ? "Lancar" : "Terhambat"})\n` +
      `• *Active Handles* : \`${activeHandles}\`\n` +
      `• *Active Requests*: \`${activeRequests}\`\n` +
      `• *Bot Uptime*     : \`${formatUptime(process.uptime())}\`\n` +
      `• *OS Uptime*      : \`${formatUptime(os.uptime())}\`\n\n` +
      `*MEMORY ALLOCATION (V8)*\n` +
      `• *RSS (Physical)* : \`${formatBytes(mem.rss)}\`\n` +
      `• *Heap Total*     : \`${formatBytes(mem.heapTotal)}\`\n` +
      `• *Heap Used*      : \`${formatBytes(mem.heapUsed)}\` (\`${heapUsagePercent}%\` dari batas)\n` +
      `• *Heap Limit*     : \`${formatBytes(heap.heap_size_limit)}\`\n` +
      `• *External / C++* : \`${formatBytes(mem.external)}\`\n` +
      `• *ArrayBuffers*   : \`${formatBytes(mem.arrayBuffers || 0)}\`\n` +
      `• *Fragmentasi*    : \`${heapFragmentation}%\`\n\n` +
      `*SERVER HARDWARE (OS)*\n` +
      `• *Platform*       : \`${os.type()} ${os.arch()}\`\n` +
      `• *CPU Model*      : \`${os.cpus()[0]?.model?.trim() || "Unknown"}\`\n` +
      `• *CPU Cores*      : \`${os.cpus().length} Core\`\n` +
      `• *Load Average*   : \`${load.join(" | ")}\` (1m, 5m, 15m)\n` +
      `• *RAM Server*     : \`${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}\`\n\n` +
      `*Opsi Tambahan:*\n` +
      `• \`.perf bench\` : Uji kecepatan eksekusi CPU & thread\n` +
      `• \`.perf opt\`   : Pemicu kompresi & pembersihan memori`;

    return m.reply(text);
  },
};
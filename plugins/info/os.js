import os from "os";
import fs from "fs";

const isTermux = !!process.env.PREFIX?.includes("termux");

function getCpuModel() {
  try {
    const cpus = os.cpus();
    if (cpus.length > 0 && cpus[0].model) return cpus[0].model.trim();

    const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf-8");
    return (
      cpuinfo.match(/Hardware\s*:\s*(.+)/)?.[1]?.trim() ||
      cpuinfo.match(/model name\s*:\s*(.+)/)?.[1]?.trim() ||
      cpuinfo.match(/Processor\s*:\s*(.+)/)?.[1]?.trim() ||
      "Unknown"
    );
  } catch {
    return "Unknown";
  }
}

function getCpuUsage() {
  try {
    const cpus = os.cpus();
    if (!cpus.length) return null;

    const times = cpus[0].times;
    const total = Object.values(times).reduce((a, b) => a + b, 0);
    return Object.keys(times)
      .map(
        (type) =>
          `${type.padEnd(6)} : ${((100 * times[type]) / total).toFixed(2)}%`,
      )
      .join("\n");
  } catch {
    return null;
  }
}

function getCpuCores() {
  try {
    const cpus = os.cpus();
    if (cpus.length > 0) return cpus.length;

    const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf-8");
    const processors = cpuinfo.match(/^processor/gm);
    return processors?.length || 1;
  } catch {
    return "-";
  }
}

export default {
  name: "os",
  category: "info",
  command: ["os"],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const start = process.hrtime();
    const used = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const diff = process.hrtime(start);
    const latency = (diff[0] * 1e9 + diff[1]) / 1e6;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const memoryUsage = Object.keys(used)
      .map(
        (key) =>
          `${key.padEnd(12)} : ${(used[key] / 1024 / 1024).toFixed(2)} MB`,
      )
      .join("\n");

    const cpuModel = getCpuModel();
    const cpuCores = getCpuCores();
    const cpuUsage = getCpuUsage();

    const respon = `
Kecepatan Respon : ${latency.toFixed(2)} ms
Platform         : ${isTermux ? "Termux (Android)" : `${os.type()} ${os.arch()}`}

Waktu Berjalan   : ${hours}h ${minutes}m ${seconds}s

Info Server
RAM              : ${((totalMem - freeMem) / 1024 / 1024).toFixed(2)} MB / ${(totalMem / 1024 / 1024).toFixed(2)} MB

NodeJS Memory Usage
${memoryUsage}

CPU
${cpuModel}
Cores  : ${cpuCores}
${cpuUsage || "Usage  : Tidak tersedia"}
`.trim();

    await m.reply(respon);
  },
};

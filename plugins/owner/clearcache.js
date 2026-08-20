import fs from "fs";
import path from "path";
import { contactStore } from "#store/contact-store.js";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default {
  name: "clearcache",
  category: "owner",
  command: ["clearcache", "cleansampah", "cleanram", "clearjunk", "prune"],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: true,
    protected: true
  },

  run: async (conn, m) => {
    const rootDir = process.cwd();
    const tmpDir = path.join(rootDir, "tmp");
    const sessionsDir = path.join(rootDir, "sessions");

    let deletedFilesCount = 0;
    let freedBytes = 0;

    if (fs.existsSync(tmpDir)) {
      try {
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          const filePath = path.join(tmpDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              freedBytes += stat.size;
              fs.unlinkSync(filePath);
              deletedFilesCount++;
            }
          } catch {}
        }
      } catch {}
    }

    let sessionJunkCount = 0;
    if (fs.existsSync(sessionsDir)) {
      try {
        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
          if (/\.(tmp|corrupt.*|bak)$/i.test(file)) {
            const filePath = path.join(sessionsDir, file);
            try {
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                freedBytes += stat.size;
                fs.unlinkSync(filePath);
                sessionJunkCount++;
              }
            } catch {}
          }
        }
      } catch {}
    }

    try {
      if (typeof contactStore?.clearCache === "function") {
        contactStore.clearCache();
      }
    } catch {}

    const heapBefore = process.memoryUsage().heapUsed;

    if (typeof global.gc === "function") {
      try {
        global.gc();
      } catch {}
    }

    const heapAfter = process.memoryUsage().heapUsed;
    const memoryFreed = Math.max(0, heapBefore - heapAfter);

    return m.reply(
      `*SYSTEM CACHE & JUNK CLEANUP*\n\n` +
        `• *File Temp Dihapus*    : \`${deletedFilesCount} file\`\n` +
        `• *Sampah Sesi Dihapus* : \`${sessionJunkCount} file\`\n` +
        `• *Ruang Disk Bebas*   : \`${formatBytes(freedBytes)}\` \n` +
        `• *RAM Bebas (Heap)*   : \`${formatBytes(memoryFreed)}\` \n` +
        `• *Status GC Engine*   : \`${typeof global.gc === "function" ? "Active" : "Disabled"}\` \n\n` +
        `Seluruh cache dan file sampah sementara berhasil dibersihkan.`
    );
  },
};
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const sessionsFolder = path.join(process.cwd(), "sessions");
const dbPath = path.resolve(path.join(sessionsFolder, "auth.db"));

export async function analyzeAndCleanSession(cleanMode = false) {
  if (!fs.existsSync(dbPath)) {
    throw new Error("File auth.db tidak ditemukan di folder sessions.");
  }

  const initialStat = fs.statSync(dbPath);
  const initialSizeMb = (initialStat.size / (1024 * 1024)).toFixed(2);

  const SQL = await initSqlJs();
  let db;

  try {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } catch (err) {
    throw new Error("Gagal membaca database auth.db: " + err.message);
  }

  const keyStats = {};
  try {
    const stmt = db.prepare("SELECT category, count(*) as total FROM keys GROUP BY category;");
    while (stmt.step()) {
      const row = stmt.getAsObject();
      keyStats[row.category] = row.total;
    }
    stmt.free();
  } catch {}

  let cleanedPreKeys = 0;

  if (cleanMode) {
    try {
      const preKeyCount = keyStats["pre-key"] || 0;
      if (preKeyCount > 50) {
        db.exec(`
          DELETE FROM keys 
          WHERE category = 'pre-key' 
          AND id NOT IN (
            SELECT id FROM keys WHERE category = 'pre-key' ORDER BY updated_at DESC LIMIT 50
          );
        `);
        cleanedPreKeys = preKeyCount - 50;
      }

      db.exec("VACUUM;");

      const data = db.export();
      const tmpPath = dbPath + ".tmp";
      fs.writeFileSync(tmpPath, Buffer.from(data));
      fs.renameSync(tmpPath, dbPath);
    } catch (e) {
      db.close();
      throw new Error("Gagal memproses pembersihan auth.db: " + e.message);
    }
  }

  db.close();

  const finalStat = fs.statSync(dbPath);
  const finalSizeMb = (finalStat.size / (1024 * 1024)).toFixed(2);

  let healthStatus = "🟢 PRIMA";
  if (finalStat.size > 50 * 1024 * 1024) {
    healthStatus = "🔴 MEMBENGKAK";
  } else if (finalStat.size > 20 * 1024 * 1024) {
    healthStatus = "🟡 SEDANG";
  }

  return {
    initialSizeMb,
    finalSizeMb,
    keyStats,
    cleanedPreKeys,
    healthStatus
  };
}
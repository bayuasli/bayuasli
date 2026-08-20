import initSqlJs from 'sql.js';
import { Mutex } from 'async-mutex';
import { BufferJSON, initAuthCreds, proto } from 'baileys';
import path from 'path';
import fs from 'fs';

const ALLOWED_KEYS = new Set([
  'pre-key',
  'session',
  'sender-key',
  'app-state-sync-key',
  'app-state-sync-version'
]);

export default async (folder = './sessions') => {
  const mutex = new Mutex();
  const dbPath = path.resolve(path.join(folder, 'auth.db'));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      const backupPath = dbPath + '.corrupt.' + Date.now();
      fs.copyFileSync(dbPath, backupPath);
      console.error(`auth.db corrupt, backup disimpan di ${backupPath}. Membuat database baru.`);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  function persist() {
    const data = db.export();
    const tmpPath = dbPath + '.tmp';
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, dbPath);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS creds (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS keys (
      category TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT,
      updated_at INTEGER,
      PRIMARY KEY (category, id)
    );
  `);

  persist();

  const readCreds = () =>
    mutex.runExclusive(() => {
      const res = db.exec(`SELECT data FROM creds WHERE id=1`);
      if (!res.length || !res[0].values.length) return null;
      return JSON.parse(res[0].values[0][0], BufferJSON.reviver);
    });

  const writeCreds = (creds) =>
    mutex.runExclusive(() => {
      db.run(
        `INSERT OR REPLACE INTO creds (id, data, updated_at) VALUES (1, ?, ?)`,
        [JSON.stringify(creds, BufferJSON.replacer), Date.now()]
      );
      persist();
    });

  const readKey = (category, id) =>
    mutex.runExclusive(() => {
      const res = db.exec(
        `SELECT data FROM keys WHERE category=? AND id=?`,
        [category, id]
      );
      if (!res.length || !res[0].values.length) return null;

      let value = JSON.parse(res[0].values[0][0], BufferJSON.reviver);
      if (category === 'app-state-sync-key') {
        value = proto.Message.AppStateSyncKeyData.fromObject(value);
      }
      return value;
    });

  const setKeys = (data) =>
    mutex.runExclusive(() => {
      let changed = false;

      for (const category in data) {
        if (!ALLOWED_KEYS.has(category)) continue;
        for (const id in data[category]) {
          const value = data[category][id];

          if (value) {
            db.run(
              `INSERT OR REPLACE INTO keys (category, id, data, updated_at) VALUES (?, ?, ?, ?)`,
              [category, id, JSON.stringify(value, BufferJSON.replacer), Date.now()]
            );
          } else {
            db.run(`DELETE FROM keys WHERE category=? AND id=?`, [category, id]);
          }
          changed = true;
        }
      }

      if (changed) persist();
    });

  const creds = (await readCreds()) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            result[id] = await readKey(type, id);
          }
          return result;
        },
        set: async (data) => {
          await setKeys(data);
        }
      }
    },
    saveCreds: async () => {
      await writeCreds(creds);
    }
  };
};
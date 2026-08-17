import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const dbDir = path.resolve('./lib/database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.sqlite');


const SQL = await initSqlJs();
let db;


if (fs.existsSync(dbPath)) {
  const fileBuffer = fs.readFileSync(dbPath);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
  saveToDisk();
}


function saveToDisk() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export default {
  run: async (query, params = []) => {
    try {
      db.run(query, params);
      saveToDisk(); 
      return true;
    } catch (err) {
      throw err;
    }
  },

  all: async (query, params = []) => {
    try {
      const stmt = db.prepare(query);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (err) {
      throw err;
    }
  },

  get: async (query, params = []) => {
    try {
      const stmt = db.prepare(query);
      stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    } catch (err) {
      throw err;
    }
  },

  close: async () => {
    saveToDisk();
    db.close();
  }
};
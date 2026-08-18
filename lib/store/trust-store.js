import { db } from "./contact-store.js";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "lib/database/store.db");

function saveDb() {
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch {}
}

db.exec(`
CREATE TABLE IF NOT EXISTS trusted_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE,
  commands TEXT,
  created_at INTEGER
);
`);

export function isTrustedUser(jid, command) {
  if (!jid || !command) return false;
  try {
    const stmt = db.prepare("SELECT commands FROM trusted_users WHERE jid = :jid;");
    stmt.bind({ ":jid": jid });
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    if (!row) return false;
    if (row.commands === "*" || row.commands === '["*"]') return true;

    const allowed = JSON.parse(row.commands || "[]");
    return allowed.includes(command.toLowerCase());
  } catch {
    return false;
  }
}

export function getTrustCommands(jid) {
  if (!jid) return null;
  try {
    const stmt = db.prepare("SELECT commands FROM trusted_users WHERE jid = :jid;");
    stmt.bind({ ":jid": jid });
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    if (!row) return null;
    if (row.commands === "*" || row.commands === '["*"]') return "*";
    return JSON.parse(row.commands || "[]");
  } catch {
    return null;
  }
}

export function addTrust(jid, newCommands = ["*"]) {
  if (!jid) return false;
  const now = Math.floor(Date.now() / 1000);

  let finalCommands = "*";

  if (!newCommands.includes("*")) {
    const current = getTrustCommands(jid);
    const set = new Set(Array.isArray(current) ? current : []);
    newCommands.forEach((cmd) => set.add(cmd.toLowerCase()));
    finalCommands = JSON.stringify(Array.from(set));
  }

  const stmt = db.prepare(`
    INSERT INTO trusted_users (jid, commands, created_at)
    VALUES (:jid, :commands, :createdAt)
    ON CONFLICT(jid) DO UPDATE SET commands = excluded.commands, created_at = excluded.created_at;
  `);
  stmt.run({ ":jid": jid, ":commands": finalCommands, ":createdAt": now });
  stmt.free();
  saveDb();
  return true;
}

export function removeTrust(jid) {
  if (!jid) return false;
  const stmt = db.prepare("DELETE FROM trusted_users WHERE jid = :jid;");
  stmt.run({ ":jid": jid });
  stmt.free();
  saveDb();
  return true;
}

export function getTrustList() {
  const stmt = db.prepare("SELECT id, jid, commands FROM trusted_users;");
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function findPlugin(input) {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/\.js$/i, "").replace(/^plugins\//, "");
  const plugins = Object.values(global.plugins || {});

  for (const p of plugins) {
    if (p.name && p.name.toLowerCase() === clean) return p;
    if (p.category && `${p.category.toLowerCase()}/${p.name?.toLowerCase()}` === clean) return p;
  }

  for (const p of plugins) {
    const cmds = Array.isArray(p.command) ? p.command : p.command ? [p.command] : [];
    const aliases = Array.isArray(p.alias) ? p.alias : p.alias ? [p.alias] : [];
    const all = [...cmds, ...aliases].map((c) => c?.toLowerCase());
    if (all.includes(clean) || all.some((c) => clean.endsWith("/" + c))) {
      return p;
    }
  }

  return null;
}

export function getPluginCommands(plugin) {
  if (!plugin) return [];
  const cmds = Array.isArray(plugin.command) ? plugin.command : plugin.command ? [plugin.command] : [];
  const aliases = Array.isArray(plugin.alias) ? plugin.alias : plugin.alias ? [plugin.alias] : [];
  return Array.from(new Set([...cmds, ...aliases].filter(Boolean).map((c) => c.toLowerCase())));
}
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const dbDir = path.join(process.cwd(), 'lib/database')
const dbFile = path.join(dbDir, 'stickercmd.sqlite')

let SQL = null
let db = null
let dirty = false

async function init() {
  if (db) return db

  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  SQL = await initSqlJs()

  if (fs.existsSync(dbFile)) {
    db = new SQL.Database(fs.readFileSync(dbFile))
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sticker_cmd (
      hash TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      mentioned_jid TEXT DEFAULT '[]',
      creator TEXT,
      locked INTEGER DEFAULT 0,
      created_at INTEGER
    );
  `)

  save()
  setInterval(() => { if (dirty) save() }, 15000)

  return db
}

function save() {
  if (!db) return
  const tmpFile = dbFile + '.tmp'
  fs.writeFileSync(tmpFile, Buffer.from(db.export()))
  fs.renameSync(tmpFile, dbFile)
  dirty = false
}

function one(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export async function getSticker(hash) {
  await init()
  const row = one(`SELECT * FROM sticker_cmd WHERE hash = ?`, [hash])
  if (!row) return null

  return {
    hash: row.hash,
    text: row.text,
    mentionedJid: JSON.parse(row.mentioned_jid || '[]'),
    creator: row.creator,
    locked: !!row.locked,
    createdAt: row.created_at
  }
}

export async function setSticker(hash, { text, mentionedJid = [], creator }) {
  await init()

  const existing = one(`SELECT locked FROM sticker_cmd WHERE hash = ?`, [hash])
  if (existing?.locked) {
    throw new Error('Kamu tidak memiliki izin untuk mengubah perintah stiker ini')
  }

  db.run(
    `INSERT OR REPLACE INTO sticker_cmd (hash, text, mentioned_jid, creator, locked, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [hash, text, JSON.stringify(mentionedJid), creator, Date.now()]
  )

  dirty = true
}

export async function lockSticker(hash, locked) {
  await init()

  const existing = one(`SELECT hash FROM sticker_cmd WHERE hash = ?`, [hash])
  if (!existing) throw new Error('Hash not found in database')

  db.run(`UPDATE sticker_cmd SET locked = ? WHERE hash = ?`, [locked ? 1 : 0, hash])
  dirty = true
}

export async function deleteSticker(hash) {
  await init()

  const existing = one(`SELECT locked FROM sticker_cmd WHERE hash = ?`, [hash])
  if (!existing) throw new Error('Hash not found in database')
  if (existing.locked) throw new Error('Kamu tidak memiliki izin untuk menghapus perintah stiker ini')

  db.run(`DELETE FROM sticker_cmd WHERE hash = ?`, [hash])
  dirty = true
}

export async function listStickers() {
  await init()
  return all(`SELECT * FROM sticker_cmd ORDER BY created_at ASC`).map(row => ({
    hash: row.hash,
    text: row.text,
    mentionedJid: JSON.parse(row.mentioned_jid || '[]'),
    creator: row.creator,
    locked: !!row.locked,
    createdAt: row.created_at
  }))
}
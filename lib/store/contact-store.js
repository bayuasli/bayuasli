import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { isLidUser, jidDecode, jidNormalizedUser } from 'baileys'

const dbDir = path.join(process.cwd(), 'lib/database')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'store.db')

const SQL = await initSqlJs()
let db

if (fs.existsSync(dbPath)) {
  const fileBuffer = fs.readFileSync(dbPath)
  db = new SQL.Database(fileBuffer)
} else {
  db = new SQL.Database()
}

let saveTimeout = null
function saveDb() {
  if (saveTimeout) return
  saveTimeout = setTimeout(() => {
    saveTimeout = null
    try {
      const data = db.export()
      fs.promises.writeFile(dbPath, Buffer.from(data)).catch(() => {})
    } catch {}
  }, 5000)
}

process.on('exit', () => {
  try {
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  } catch {}
})

db.exec(`
CREATE TABLE IF NOT EXISTS contacts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	primary_id TEXT UNIQUE,
	primary_server TEXT,
	name TEXT,
	secondary_id TEXT UNIQUE,
	username TEXT,
	alias TEXT,
	updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_contacts_primary_server
ON contacts (primary_server);

CREATE INDEX IF NOT EXISTS idx_contacts_secondary_id
ON contacts (secondary_id);
`)

function queryGet(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  let result = null
  if (stmt.step()) {
    result = stmt.getAsObject()
  }
  stmt.free()
  return result
}

function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryRun(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.run(params)
  stmt.free()
  saveDb()
}

export function contactSerialize(WAM, conn) {
  if (!WAM || !WAM.key) return undefined
  const { key, verifiedBizName, pushName } = WAM

  let primaryId
  let secondaryId
  let name = pushName || verifiedBizName
  let updatedAt = typeof WAM.messageTimestamp === 'object'
    ? WAM.messageTimestamp?.toNumber?.() || Math.floor(Date.now() / 1000)
    : WAM.messageTimestamp || Math.floor(Date.now() / 1000)

  const decoded = jidDecode(key.remoteJid)
  const removeJidServer = decoded?.server

  if (removeJidServer === 'g.us') {
    if (key.addressingMode === 'lid') {
      primaryId = key?.participant
      secondaryId = key?.participantAlt
    } else {
      if (isLidUser(key?.participant)) {
        primaryId = key?.participant
      }
    }
  } else if (removeJidServer === 'lid') {
    if (key.addressingMode === 'lid') {
      primaryId = key?.remoteJid
      secondaryId = key?.remoteJidAlt

      if (key?.fromMe) {
        primaryId = jidNormalizedUser(conn?.user?.lid)
        secondaryId = jidNormalizedUser(conn?.user?.id)
        name = conn?.user?.name || global.title || global.namebot || 'Z3PHWOLF'
      }
    }
  } else if (removeJidServer === 'broadcast') {
    if (key.addressingMode === 'lid') {
      primaryId = key?.participant
      secondaryId = key?.remoteJidAlt
    }
  } else if (removeJidServer === 's.whatsapp.net') {
    if (key.remoteJid === '0@s.whatsapp.net') {
      primaryId = '0@s.whatsapp.net'
    } else {
      return undefined
    }
  } else {
    primaryId = key?.remoteJid
  }

  if (!primaryId && WAM?.key?.fromMe) {
    primaryId = jidNormalizedUser(conn?.user?.lid || conn?.user?.id)
  }

  if (!primaryId) {
    primaryId = WAM?.participant
  }

  return {
    primaryId,
    secondaryId,
    name,
    updatedAt
  }
}

class ContactStoreClass {
  #contactCache = new Map()
  #tempDebounceLidMapping
  #tempLIDMappings = []
  #intervalCache = {
    intervalValue: undefined,
    invervalObject: undefined
  }

  constructor() {
    this.setClearCacheEvery(12 * 60 * 60 * 1000)
  }

  setClearCacheEvery(ms) {
    if (!this.#intervalCache.intervalValue) {
      this.#intervalCache.invervalObject = setInterval(() => this.clearCache(), ms)
      if (this.#intervalCache.invervalObject.unref) {
        this.#intervalCache.invervalObject.unref()
      }
      this.#intervalCache.intervalValue = ms
    }
  }

  clearCache() {
    this.#contactCache.clear()
  }

  stopClearCache() {
    if (this.#intervalCache.intervalValue) {
      clearInterval(this.#intervalCache.invervalObject)
      this.#intervalCache.intervalValue = undefined
      this.#intervalCache.invervalObject = undefined
    }
  }

  getAllContacts() {
    return queryAll(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts`
    )
  }

  upsertLidPnMappingsFromSync(lidMappings) {
    if (!Array.isArray(lidMappings) || !lidMappings.length) return
    const now = Math.floor(Date.now() / 1000)

    for (const v of lidMappings) {
      const primaryId = v.lid
      const secondaryId = v.pn
      const primaryServer = 'lid'

      if (!primaryId) continue

      const existing = queryGet('SELECT * FROM contacts WHERE primary_id = :primaryId', { ':primaryId': primaryId })
      if (existing) {
        queryRun(
          `UPDATE contacts SET secondary_id = coalesce(:secondaryId, secondary_id), updated_at = :updatedAt WHERE primary_id = :primaryId`,
          { ':secondaryId': secondaryId, ':updatedAt': now, ':primaryId': primaryId }
        )
      } else {
        queryRun(
          `INSERT INTO contacts (primary_id, primary_server, secondary_id, updated_at) VALUES (:primaryId, :primaryServer, :secondaryId, :updatedAt)`,
          { ':primaryId': primaryId, ':primaryServer': primaryServer, ':secondaryId': secondaryId, ':updatedAt': now }
        )
      }
    }
  }

  upsertSingleLidMapping(lidMapping) {
    if (this.#tempDebounceLidMapping) clearTimeout(this.#tempDebounceLidMapping)
    this.#tempLIDMappings.push(lidMapping)
    this.#tempDebounceLidMapping = setTimeout(() => {
      this.upsertLidPnMappingsFromSync(this.#tempLIDMappings)
      this.#tempLIDMappings.length = 0
      this.#tempDebounceLidMapping = undefined
    }, 1000)
  }

  getContactByPrimaryId(primaryId) {
    if (!primaryId) return undefined
    const cache = this.#contactCache.get(primaryId)
    if (cache) return cache

    const dbResult = queryGet(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE primary_id = :primaryId`,
      { ':primaryId': primaryId }
    )

    if (dbResult) {
      this.#contactCache.set(primaryId, dbResult)
      return dbResult
    }
    return undefined
  }

  getContact(primaryId) {
    return this.getContactByPrimaryId(primaryId)
  }

  getContactByPn(pn) {
    if (!pn || typeof pn !== 'string') return undefined
    return queryGet(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE secondary_id = :pn`,
      { ':pn': pn }
    )
  }

  getContactById(id) {
    if (!id) return undefined
    return queryGet(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE id = :id`,
      { ':id': id }
    )
  }

  upsertAndGetContact(base, options = {}) {
    const { primaryId = null, secondaryId = null, name = null, updatedAt = Math.floor(Date.now() / 1000) } = base || {}
    const { skipAddCache = false } = options

    if (!primaryId) return undefined

    const cache = this.#contactCache.get(primaryId)

    if (cache) {
      const needUpdateName = cache.name !== name && name
      const needUpdatePn = cache.secondaryId !== secondaryId && secondaryId

      if (needUpdateName || needUpdatePn) {
        queryRun(
          `UPDATE contacts SET name = coalesce(:name, name), secondary_id = coalesce(:secondaryId, secondary_id), updated_at = :updatedAt WHERE id = :id`,
          { ':name': name, ':secondaryId': secondaryId, ':updatedAt': updatedAt, ':id': cache.id }
        )

        const updated = queryGet(
          `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE id = :id`,
          { ':id': cache.id }
        )

        if (updated) this.#contactCache.set(primaryId, updated)
        return updated || cache
      }
      return cache
    }

    const decoded = jidDecode(primaryId)
    const primaryServer = decoded?.server || 's.whatsapp.net'

    const existingInDb = queryGet(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE primary_id = :primaryId`,
      { ':primaryId': primaryId }
    )

    if (existingInDb) {
      const needUpdateName = existingInDb.name !== name && name
      const needUpdatePn = existingInDb.secondaryId !== secondaryId && secondaryId

      if (needUpdateName || needUpdatePn) {
        queryRun(
          `UPDATE contacts SET name = coalesce(:name, name), secondary_id = coalesce(:secondaryId, secondary_id), updated_at = :updatedAt WHERE id = :id`,
          { ':name': name, ':secondaryId': secondaryId, ':updatedAt': updatedAt, ':id': existingInDb.id }
        )

        const updated = queryGet(
          `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE id = :id`,
          { ':id': existingInDb.id }
        )

        if (updated && !skipAddCache) this.#contactCache.set(primaryId, updated)
        return updated || existingInDb
      }

      if (!skipAddCache) this.#contactCache.set(primaryId, existingInDb)
      return existingInDb
    }

    queryRun(
      `INSERT INTO contacts (primary_id, primary_server, secondary_id, name, updated_at) VALUES (:primaryId, :primaryServer, :secondaryId, :name, :updatedAt)`,
      { ':primaryId': primaryId, ':primaryServer': primaryServer, ':secondaryId': secondaryId, ':name': name, ':updatedAt': updatedAt }
    )

    const newContact = queryGet(
      `SELECT id, primary_id as primaryId, primary_server as primaryServer, name, secondary_id as secondaryId FROM contacts WHERE primary_id = :primaryId`,
      { ':primaryId': primaryId }
    )

    if (newContact && !skipAddCache) {
      this.#contactCache.set(primaryId, newContact)
    }

    return newContact
  }
}

export const contactStore = new ContactStoreClass()
export const ContactStore = contactStore

export async function syncFromParticipants(participants = []) {
  if (!Array.isArray(participants) || !participants.length) return
  for (const p of participants) {
    const jid = p.id || p.jid
    if (!jid) continue
    const secondaryId = p.lid || p.phoneNumber || null
    const name = p.name || p.notify || null
    contactStore.upsertAndGetContact({
      primaryId: jid,
      secondaryId,
      name
    })
  }
}

export { db }
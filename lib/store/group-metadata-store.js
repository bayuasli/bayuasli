import fs from 'fs'
import path from 'path'
import { areJidsSameUser, jidNormalizedUser } from 'baileys'
import { db, contactStore } from './contact-store.js'

function saveDb() {
  try {
    const data = db.export()
    const dbPath = path.join(process.cwd(), 'lib/database/store.db')
    fs.writeFileSync(dbPath, Buffer.from(data))
  } catch {}
}

db.exec(`
CREATE TABLE IF NOT EXISTS group_participants (
    chat_id INTEGER NOT NULL REFERENCES contacts(id),
    contact_id INTEGER NOT NULL REFERENCES contacts(id),
    invited_by INTEGER REFERENCES contacts(id),
    invited_at INTEGER,
    kicked_by INTEGER REFERENCES contacts(id),
    kicked_at INTEGER,
    admin TEXT,
    admin_updated_by INTEGER REFERENCES contacts(id),
    admin_updated_at INTEGER,
    label TEXT,
    label_updated_at INTEGER,
    PRIMARY KEY (chat_id, contact_id)
);
`)

function queryGet(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  let result = null
  if (stmt.step()) result = stmt.getAsObject()
  stmt.free()
  return result
}

function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryRun(sql, params = {}) {
  const stmt = db.prepare(sql)
  stmt.run(params)
  stmt.free()
  saveDb()
}

class GroupMetadataStore {
  #cacheGroupMetadata = new Map()
  #cacheAdmin = new Map()

  constructor() {
    this.#loadAdminCache()
  }

  #loadAdminCache() {
    try {
      const rows = queryAll(`
        SELECT chat.primary_id as jid, contact.primary_id as lid, gp.admin
        FROM group_participants gp
        LEFT JOIN contacts chat ON gp.chat_id = chat.id
        LEFT JOIN contacts contact ON gp.contact_id = contact.id
        WHERE gp.admin IS NOT NULL AND gp.kicked_at IS NULL
      `)

      for (const row of rows) {
        if (!row.jid || !row.lid) continue
        if (!this.#cacheAdmin.has(row.jid)) {
          this.#cacheAdmin.set(row.jid, {})
        }
        const obj = this.#cacheAdmin.get(row.jid)
        obj[row.lid] = row.admin
      }
    } catch {}
  }

  async pickSavedGM() {
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) return

    try {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('@g.us.json'))
      for (const filename of files) {
        const filePath = path.join(tmpDir, filename)
        const text = fs.readFileSync(filePath, 'utf-8')
        const gm = JSON.parse(text)
        this.upsertGroupMetadata(gm)
      }
    } catch {}
  }

  async getGroupMetadata(jid, conn) {
    if (!jid) return undefined
    const cached = this.#cacheGroupMetadata.get(jid)
    if (cached) return cached

    try {
      const newGm = await conn.groupMetadata(jid)
      if (newGm) {
        this.upsertGroupMetadata(newGm, conn)
      }
      return newGm
    } catch {
      return undefined
    }
  }

  upsertGroupMetadata(groupMetadata, conn, isGroupUpsert = false) {
    if (!groupMetadata || !groupMetadata.id) return
    const now = Math.floor(Date.now() / 1000)

    const chat = contactStore.upsertAndGetContact({
      primaryId: groupMetadata.id,
      name: groupMetadata.subject
    })

    if (!chat) return

    if (groupMetadata.author && isGroupUpsert && conn) {
      const contactAuthor = contactStore.upsertAndGetContact({
        primaryId: groupMetadata.author,
        secondaryId: groupMetadata.authorPn
      })

      const botJid = conn.user?.lid || conn.user?.id
      const contactBot = contactStore.upsertAndGetContact({
        primaryId: jidNormalizedUser(botJid),
        secondaryId: jidNormalizedUser(conn.user?.id)
      })

      if (contactBot && contactAuthor) {
        queryRun(`
          INSERT INTO group_participants (chat_id, contact_id, invited_by, invited_at)
          VALUES (:chatId, :contactId, :invitedBy, :invitedAt)
          ON CONFLICT(chat_id, contact_id) DO UPDATE SET
          kicked_at = NULL, kicked_by = NULL, invited_by = excluded.invited_by, invited_at = excluded.invited_at
        `, {
          ':chatId': chat.id,
          ':contactId': contactBot.id,
          ':invitedBy': contactAuthor.id,
          ':invitedAt': now
        })
      }
    }

    if (groupMetadata.participants && Array.isArray(groupMetadata.participants)) {
      const groupLids = groupMetadata.participants.map(p => p.id)

      for (const p of groupMetadata.participants) {
        const contact = contactStore.upsertAndGetContact({
          primaryId: p.id,
          secondaryId: p.phoneNumber || null
        }, { skipAddCache: true })

        if (contact) {
          queryRun(`
            INSERT INTO group_participants (chat_id, contact_id, invited_at, admin)
            VALUES (:chatId, :contactId, :invitedAt, :admin)
            ON CONFLICT(chat_id, contact_id) DO UPDATE SET
            kicked_at = NULL, kicked_by = NULL, admin = excluded.admin
          `, {
            ':chatId': chat.id,
            ':contactId': contact.id,
            ':invitedAt': now,
            ':admin': p.admin || null
          })
        }
      }

      const dbLids = queryAll(`
        SELECT con.primary_id as lid FROM group_participants gp
        LEFT JOIN contacts con ON gp.contact_id = con.id
        WHERE gp.kicked_at IS NULL AND gp.chat_id = :chatId
      `, { ':chatId': chat.id }).map(r => r.lid)

      const outdatedLids = dbLids.filter(dbLid => !groupLids.includes(dbLid))

      for (const lid of outdatedLids) {
        const contact = contactStore.getContact(lid)
        if (contact) {
          queryRun(`
            UPDATE group_participants SET kicked_by = NULL, kicked_at = :kickedAt, admin = NULL
            WHERE chat_id = :chatId AND contact_id = :contactId
          `, { ':kickedAt': now, ':chatId': chat.id, ':contactId': contact.id })
        }
      }

      this.#cacheGroupMetadata.set(groupMetadata.id, groupMetadata)

      const adminObj = {}
      const participantAdmins = groupMetadata.participants.filter(p => p.admin)
      for (const p of participantAdmins) {
        adminObj[p.id] = p.admin
      }
      this.#cacheAdmin.set(groupMetadata.id, adminObj)
    }

    const existing = this.#cacheGroupMetadata.get(groupMetadata.id)
    if (existing) {
      Object.assign(existing, groupMetadata)
    } else {
      this.#cacheGroupMetadata.set(groupMetadata.id, groupMetadata)
    }
  }

  upsertParticipant(update, conn) {
    if (!update || !update.groupJid || !update.targetLid) return
    const {
      groupJid,
      authorLid,
      targetLid,
      targetPn,
      authorAction,
      timestamp = Math.floor(Date.now() / 1000)
    } = update

    const chat = contactStore.upsertAndGetContact({ primaryId: groupJid })
    if (!chat) return

    const authorContact = authorLid ? contactStore.upsertAndGetContact({ primaryId: authorLid }) : null
    const targetContact = contactStore.upsertAndGetContact({ primaryId: targetLid, secondaryId: targetPn })
    if (!targetContact) return

    if (authorAction === 'add') {
      queryRun(`
        INSERT INTO group_participants (chat_id, contact_id, invited_by, invited_at)
        VALUES (:chatId, :contactId, :invitedBy, :invitedAt)
        ON CONFLICT(chat_id, contact_id) DO UPDATE SET
        kicked_at = NULL, kicked_by = NULL, invited_by = excluded.invited_by, invited_at = excluded.invited_at
      `, {
        ':chatId': chat.id,
        ':contactId': targetContact.id,
        ':invitedBy': authorContact?.id || null,
        ':invitedAt': timestamp
      })

      const gmCache = this.#cacheGroupMetadata.get(groupJid)
      if (gmCache && gmCache.participants) {
        const exist = gmCache.participants.find(p => p.id === targetLid)
        if (!exist) {
          gmCache.participants.push({ id: targetLid, phoneNumber: targetPn, admin: undefined })
          gmCache.size = gmCache.participants.length
        }
      }
    } else if (authorAction === 'remove') {
      queryRun(`
        UPDATE group_participants SET kicked_by = :kickedBy, kicked_at = :kickedAt, admin = NULL
        WHERE chat_id = :chatId AND contact_id = :contactId
      `, {
        ':kickedBy': authorContact?.id || null,
        ':kickedAt': timestamp,
        ':chatId': chat.id,
        ':contactId': targetContact.id
      })

      const adminMap = this.#cacheAdmin.get(groupJid)
      if (adminMap) delete adminMap[targetLid]

      if (conn && conn.user && areJidsSameUser(targetLid, conn.user.lid || conn.user.id)) {
        this.#cacheAdmin.delete(groupJid)
        queryRun(`DELETE FROM group_participants WHERE chat_id = :chatId`, { ':chatId': chat.id })
      }

      const gmCache = this.#cacheGroupMetadata.get(groupJid)
      if (gmCache && gmCache.participants) {
        const idx = gmCache.participants.findIndex(p => p.id === targetLid)
        if (idx > -1) {
          gmCache.participants.splice(idx, 1)
          gmCache.size = gmCache.participants.length
        }
      }
    } else if (authorAction === 'promote') {
      queryRun(`
        UPDATE group_participants SET admin = 'admin', admin_updated_by = :adminUpdatedBy, admin_updated_at = :adminUpdatedAt
        WHERE chat_id = :chatId AND contact_id = :contactId
      `, {
        ':adminUpdatedBy': authorContact?.id || null,
        ':adminUpdatedAt': timestamp,
        ':chatId': chat.id,
        ':contactId': targetContact.id
      })

      if (!this.#cacheAdmin.has(groupJid)) this.#cacheAdmin.set(groupJid, {})
      this.#cacheAdmin.get(groupJid)[targetLid] = 'admin'

      const gmCache = this.#cacheGroupMetadata.get(groupJid)
      if (gmCache && gmCache.participants) {
        const target = gmCache.participants.find(p => p.id === targetLid)
        if (target) {
          target.admin = 'admin'
        } else {
          gmCache.participants.push({ id: targetLid, phoneNumber: targetPn, admin: 'admin' })
        }
      }
    } else if (authorAction === 'demote') {
      queryRun(`
        UPDATE group_participants SET admin = NULL, admin_updated_by = :adminUpdatedBy, admin_updated_at = :adminUpdatedAt
        WHERE chat_id = :chatId AND contact_id = :contactId
      `, {
        ':adminUpdatedBy': authorContact?.id || null,
        ':adminUpdatedAt': timestamp,
        ':chatId': chat.id,
        ':contactId': targetContact.id
      })

      const adminMap = this.#cacheAdmin.get(groupJid)
      if (adminMap) delete adminMap[targetLid]

      const gmCache = this.#cacheGroupMetadata.get(groupJid)
      if (gmCache && gmCache.participants) {
        const target = gmCache.participants.find(p => p.id === targetLid)
        if (target) target.admin = null
      }
    }
  }

  getAllAdminByGroupJid(jid) {
    if (!jid) return undefined
    return this.#cacheAdmin.get(jid)
  }
}

export const groupMetadataStore = new GroupMetadataStore()
await groupMetadataStore.pickSavedGM()
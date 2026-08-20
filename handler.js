import axios from 'axios'
import fs from 'fs'
import util from 'util'
import cp from 'child_process'
import { jidNormalizedUser, generateWAMessageFromContent } from 'baileys'
import Func from '#lib/system/function.js'
import { qtext, metaai, pixx, pay, pack, poll, vn, gif, gc, video, loc, kontak, salr, order } from '#lib/helper/quoted.js'
import { VERSION, Button, ButtonV2, Carousel, AIRich, Toolkit } from '#helper'
import { getPrefixRegex, loadPrefixConfig } from '#lib/core/prefix.js'
import { isTrustedUser } from '#store/trust-store.js'
import { isBanned } from '#lib/core/antispam.js'

const jsonCache = new Map()

function readJsonCached(path) {
  try {
    const stat = fs.statSync(path)
    const cached = jsonCache.get(path)
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
    jsonCache.set(path, { mtimeMs: stat.mtimeMs, data })
    return data
  } catch {
    return null
  }
}

function buildCommandIndex(pluginsObj) {
  const commandMap = new Map()
  const onPlugins = []

  for (const plugin of Object.values(pluginsObj)) {
    if (typeof plugin.on === 'function') onPlugins.push(plugin)

    const cmds = Array.isArray(plugin.command) ? plugin.command : plugin.command ? [plugin.command] : []
    const aliases = Array.isArray(plugin.alias) ? plugin.alias : plugin.alias ? [plugin.alias] : []

    for (const name of [...cmds, ...aliases]) {
      if (!commandMap.has(name)) commandMap.set(name, plugin)
    }
  }

  return { commandMap, onPlugins }
}

const { commandMap, onPlugins } = buildCommandIndex(global.plugins || {})
const muteDB = './lib/database/mute.json'

export default async function Command(conn, m) {
  const sock = conn

  if (m.isBot) return

  const isOwner = m.fromMe || ownerNumber.includes(m.sender.split('@')[0])
  const accessDB = './lib/database/groupAccess.json'

  const muteSet = new Set(fs.existsSync(muteDB) ? readJsonCached(muteDB) || [] : [])
  const accessSet = new Set(fs.existsSync(accessDB) ? readJsonCached(accessDB) || [] : [])

  const isMuted = m.isGroup && muteSet.has(m.chat)
  const hasGroupAccess = m.isGroup && accessSet.has(m.chat)

  if (!IS_PUBLIC && !m.fromMe && !isOwner && !hasGroupAccess) return
  if (isMuted && !isOwner) return

  const quoted = m.isQuoted ? m.quoted : m
  const downloadM = async (filename) => conn.downloadMediaMessage(quoted, filename)

  if (m.isGroup && fs.existsSync(muteDB)) {
    const muted = readJsonCached(muteDB)
    if (muted?.includes(m.chat) && !isOwner) return
  }

  if (!isOwner && isBanned(m.sender)) return

  const metadata = m.isGroup
    ? conn.chats[m.chat] || await conn.groupMetadata(m.chat).catch(() => null)
    : {}

  const participant = metadata?.participants?.find(u => conn.getJid(u.id) === m.sender)
  const botParticipant = m.isGroup && metadata?.participants?.find(p =>
    p.id === conn.user.id ||
    p.phoneNumber === jidNormalizedUser(conn.user.id) ||
    conn.getJid(p.id) === jidNormalizedUser(conn.user.id)
  )

  const isAdmin = participant?.admin === 'superadmin' || participant?.admin === 'admin' || false
  const isBotAdmin = botParticipant?.admin != null || false

  conn.sock = conn

  const ctx = {
    conn,
    sock,
    m,
    Func,
    downloadM,
    quoted,
    metadata,
    isOwner,
    isAdmin,
    isBotAdmin
  }

  if (['>', '=>', '!!'].some(a => m.body?.toLowerCase().startsWith(a)) && isOwner) {
    let evalCmd = ''
    try {
      evalCmd = /await/i.test(m.text)
        ? await eval(`(async() => { ${m.text} })()`)
        : eval(m.text)
    } catch (e) {
      evalCmd = e
    }

    new Promise((resolve, reject) => {
      try {
        resolve(evalCmd)
      } catch (err) {
        reject(err)
      }
    })
      ?.then(res => m.reply(util.format(res)))
      ?.catch(err => m.reply(util.format(err)))
  }

  if (m.body?.startsWith('$') && isOwner) {
    const exec = util.promisify(cp.exec).bind(cp)
    let o
    try {
      o = await exec(m.text)
    } catch (e) {
      o = e
    } finally {
      const { stdout, stderr } = o
      if (stdout?.trim()) m.reply(stdout)
      if (stderr?.trim()) m.reply(stderr)
    }
  }

  if (m.type === 'interactiveResponseMessage') {
    try {
      const id = JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson)?.id
      if (id) m.body = id
    } catch {}
  } else if (m.type === 'listResponseMessage') {
    m.body = m.msg?.singleSelectReply?.selectedRowId || m.body
  } else if (m.type === 'buttonsResponseMessage') {
    m.body = m.msg?.selectedButtonId || m.body
  } else if (m.type === 'templateButtonReplyMessage') {
    m.body = m.msg?.selectedId || m.body
  }

  const body = (m.body || m.text || '').trim()

  if (!body && !m.isMedia && !m.isQuoted) return

  const prefixConfig = loadPrefixConfig()
  const prefixMatch = body.match(getPrefixRegex())
  m.prefix = prefixMatch ? prefixMatch[0] : ''

  let isCommand = false

  if (m.prefix && body.startsWith(m.prefix)) {
    isCommand = true
    const parts = body.slice(m.prefix.length).trim().split(/\s+/)
    m.command = parts.shift()?.toLowerCase() || ''
    m.args = parts
    m.text = parts.join(' ')
  } else {
    const parts = body.split(/\s+/)
    const firstWord = parts[0]?.toLowerCase()
    const match = commandMap.get(firstWord)

    if (match && (!prefixConfig.enabled || isOwner || match.settings?.bypassPrefix)) {
      isCommand = true
      m.command = firstWord
      m.args = parts.slice(1)
      m.text = m.args.join(' ')
    }
  }

  for (const plugin of onPlugins) {
    plugin.on(conn, m, ctx).catch(e =>
      console.error(`[PLUGIN EVENT ERROR] ${plugin.name}`, e)
    )
  }

  if (!isCommand) return

  const plugin = commandMap.get(m.command)
  if (!plugin) return

  try {
    if (global.isBotLocked && !isOwner && !plugin.settings?.bypassLock) return

    const isProtected = plugin.settings?.protected === true
    const isTrusted = isTrustedUser(m.sender, m.command)

    if (plugin.settings?.owner) {
      if (isProtected && !isOwner) return m.reply(mess.owner)
      if (!isProtected && !isOwner && !isTrusted) return m.reply(mess.owner)
    }

    if (plugin.settings?.private && m.isGroup) return m.reply(mess.private)
    if (plugin.settings?.group && !m.isGroup) return m.reply(mess.group)
    if (plugin.settings?.admin && !isAdmin) return m.reply(mess.admin)
    if (plugin.settings?.botAdmin && !isBotAdmin) return m.reply(mess.botAdmin)
    if (plugin.settings?.loading) await m.reply(mess.wait)

    if (plugin.run.length === 1) {
      await plugin.run(ctx)
    } else {
      await plugin.run(conn, m, ctx)
    }
  } catch (e) {
    console.error(`[PLUGIN ERROR] ${plugin.name}`, e)
    await m.reply('`[ERROR]` terjadi kesalahan internal saat mengeksekusi perintah.')
  }
}
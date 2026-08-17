import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { Button } from '#helper'
import {
  getAuthUser,
  listRepos,
  createRepo,
  deleteRepo,
  renameRepo,
  getRepo,
  setVisibility,
  ensureRepo,
  getRateLimit,
  searchRepos,
  starRepo,
  unstarRepo,
  forkRepo,
  listBranches,
  listCommits,
  getReadme,
  downloadRepoZip,
  uploadFile
} from '#scrape/github.js'

const dbPath = path.join(process.cwd(), 'lib/database/github.json')

function getStoredToken() {
  try {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      if (data.token) return data.token
    }
  } catch {}
  return global.githubToken || ''
}

function saveTokenToDB(token) {
  try {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, JSON.stringify({ token }, null, 2))
  } catch {}
}

function removeTokenFromDB() {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
    }
  } catch {}
}

function parseOwnerRepo(input, defaultOwner) {
  if (input.includes('/')) {
    const [owner, repo] = input.split('/')
    return { owner, repo }
  }
  return { owner: defaultOwner, repo: input }
}

function showMainMenu(conn, m) {
  return new Button(conn)
    .setTitle('GitHub Manager')
    .setBody('Pilih aksi yang ingin dilakukan:')
    .setFooter(global.body || 'sbyuxD !')
    .addSelection('Pilih Menu')
    .makeSection('Pengaturan Token')
    .makeRow('', 'Set Token', 'Ketik: .git settoken <token>', '.git settoken')
    .makeRow('', 'Hapus Token', 'Ketik: .git deltoken', '.git deltoken')
    .makeRow('', 'Status Token', 'Cek status token tersimpan', '.git token')
    .makeSection('Repo Saya')
    .makeRow('', 'List Repo', 'Lihat semua repo kamu', '.git list')
    .makeRow('', 'Buat Repo', 'Ketik: .git create <nama>', '.git create')
    .makeRow('', 'Hapus Repo', 'Ketik: .git delete <nama>', '.git delete')
    .makeRow('', 'Rename Repo', 'Ketik: .git rename <lama> <baru>', '.git rename')
    .makeRow('', 'Info Repo', 'Ketik: .git info <nama>', '.git info')
    .makeRow('', 'Ubah Visibility', 'Ketik: .git private/public <nama>', '.git private')
    .makeRow('', 'Upload ZIP', 'Reply file zip + .git upload <nama>', '.git upload')
    .makeSection('Explore & Sosial')
    .makeRow('', 'Cari Repo', 'Ketik: .git search <keyword>', '.git search')
    .makeRow('', 'Star Repo', 'Ketik: .git star <owner/repo>', '.git star')
    .makeRow('', 'Fork Repo', 'Ketik: .git fork <owner/repo>', '.git fork')
    .makeRow('', 'Lihat Branch', 'Ketik: .git branches <nama>', '.git branches')
    .makeRow('', 'Lihat Commit', 'Ketik: .git commits <nama>', '.git commits')
    .makeRow('', 'Baca README', 'Ketik: .git readme <nama>', '.git readme')
    .makeRow('', 'Download Repo', 'Ketik: .git download <nama>', '.git download')
    .makeSection('Akun')
    .makeRow('', 'Info Akun', 'Lihat profil GitHub kamu', '.git whoami')
    .makeRow('', 'Cek Rate Limit', 'Lihat sisa kuota API', '.git ratelimit')
    .send(m.chat, { quoted: m })
}

export default {
  name: 'github-manager',
  category: 'webdev',
  command: ['git', 'github'],

  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false
  },

  run: async (conn, m, { downloadM }) => {
    const args = m.args || []
    const sub = (args[0] || '').toLowerCase()

    if (!sub) return showMainMenu(conn, m)

    if (sub === 'settoken') {
      const newToken = args[1]?.trim()
      if (!newToken) {
        return m.reply('Format: `.git settoken ghp_xxxx`')
      }
      saveTokenToDB(newToken)
      return m.reply('*GITHUB TOKEN SAVED*\n\nToken GitHub berhasil disimpan ke database.')
    }

    if (sub === 'deltoken') {
      removeTokenFromDB()
      return m.reply('*GITHUB TOKEN REMOVED*\n\nToken GitHub tersimpan berhasil dihapus.')
    }

    if (sub === 'token') {
      const token = getStoredToken()
      if (!token) {
        return m.reply('Belum ada token GitHub yang tersimpan.')
      }
      const masked = token.slice(0, 4) + '...' + token.slice(-4)
      return m.reply(`*GITHUB TOKEN STATUS*\n\nToken Aktif : \`${masked}\``)
    }

    const token = getStoredToken()
    if (!token) {
      return m.reply('Token GitHub belum di-set. Gunakan `.git settoken <token>` terlebih dahulu.')
    }

    try {
      if (sub === 'upload') {
        const quoted = m.isQuoted ? m.quoted : null
        const mime = quoted?.msg?.mimetype || quoted?.mimetype || ''

        if (!quoted?.isMedia || !/zip/i.test(mime)) {
          return m.reply('Reply file ZIP, lalu ketik:\n`.git upload <nama-repo>`')
        }

        const repoName = args[1]?.trim()
        if (!repoName) {
          return m.reply('Format: `.git upload <nama-repo>` (reply file zip)')
        }

        await m.react('⏳')

        const tmpBase = path.join(process.cwd(), 'tmp', `uprepo_${Date.now()}`)
        fs.mkdirSync(tmpBase, { recursive: true })

        try {
          const buffer = await downloadM()
          const zipPath = path.join(tmpBase, 'upload.zip')
          fs.writeFileSync(zipPath, buffer)

          const zip = new AdmZip(zipPath)
          const entries = zip.getEntries().filter(e => !e.isDirectory)

          if (!entries.length) {
            return m.reply('File ZIP kosong atau tidak berisi file.')
          }

          const userInfo = await getAuthUser(token)
          const owner = userInfo.login
          await ensureRepo(token, owner, repoName)

          await m.reply(`Mengupload ${entries.length} file ke \`${owner}/${repoName}\`...`)

          let uploaded = 0
          let failed = 0

          for (const entry of entries) {
            try {
              const content = entry.getData()
              let filePath = entry.entryName

              const parts = filePath.split('/')
              if (parts.length > 1) {
                const topDirs = [...new Set(entries.map(e => e.entryName.split('/')[0]))]
                if (
                  topDirs.length === 1 &&
                  entries.every(e => e.entryName.startsWith(topDirs[0] + '/'))
                ) {
                  filePath = parts.slice(1).join('/')
                }
              }

              if (!filePath) continue

              await uploadFile(token, owner, repoName, filePath, content)
              uploaded++
              await new Promise(r => setTimeout(r, 200))
            } catch {
              failed++
            }
          }

          const rawBase = `https://raw.githubusercontent.com/${owner}/${repoName}/main`
          const repoUrl = `https://github.com/${owner}/${repoName}`

          await m.react('✅')

          return new Button(conn)
            .setBody(
              `*UPLOAD SUCCESS*\n\n` +
                `• *Repo*     : \`${owner}/${repoName}\`\n` +
                `• *Diupload* : \`${uploaded} file\`\n` +
                (failed ? `• *Gagal*    : \`${failed} file\`\n` : '') +
                `• *Raw URL*  : \`${rawBase}\``
            )
            .addUrl('Buka Repo', repoUrl, false)
            .send(m.chat, { quoted: m })
        } finally {
          fs.rmSync(tmpBase, { recursive: true, force: true })
        }
      }

      const userInfo = await getAuthUser(token)
      const user = userInfo.login

      switch (sub) {
        case 'list': {
          const repos = await listRepos(token)
          if (!repos.length) return m.reply('Daftar repository kosong.')

          let txt = `*DAFTAR REPOSITORY (${user})*\n\n`
          repos.slice(0, 20).forEach((r, i) => {
            txt += `${i + 1}. *${r.name}* [${r.private ? 'private' : 'public'}]\n`
          })

          return m.reply(txt.trim())
        }

        case 'create': {
          const name = args[1]
          if (!name) return m.reply('Format: `.git create <nama> [private] [deskripsi]`')

          const isPrivate = args.includes('private')
          const desc = args
            .slice(2)
            .filter(a => a !== 'private')
            .join(' ')

          const r = await createRepo(token, name, isPrivate, desc)

          return new Button(conn)
            .setBody(
              `*REPO BERHASIL DIBUAT*\n\n` +
                `• *Nama*       : \`${r.name}\`\n` +
                `• *Visibility* : \`${r.private ? 'private' : 'public'}\``
            )
            .addUrl('Buka Repo', r.html_url, false)
            .send(m.chat, { quoted: m })
        }

        case 'delete': {
          const name = args[1]
          if (!name) return m.reply('Format: `.git delete <nama>`')

          await deleteRepo(token, user, name)
          return m.reply(`Repository berhasil dihapus: \`${name}\``)
        }

        case 'rename': {
          const oldName = args[1]
          const newName = args[2]
          if (!oldName || !newName) return m.reply('Format: `.git rename <lama> <baru>`')

          const r = await renameRepo(token, user, oldName, newName)
          return m.reply(`Repository berhasil di-rename:\n\`${oldName}\` -> \`${r.name}\``)
        }

        case 'info': {
          const name = args[1]
          if (!name) return m.reply('Format: `.git info <nama>`')

          const r = await getRepo(token, user, name)

          return new Button(conn)
            .setBody(
              `*INFO REPOSITORY*\n\n` +
                `• *Nama*       : \`${r.name}\`\n` +
                `• *Deskripsi*  : \`${r.description || '-'}\`\n` +
                `• *Visibility* : \`${r.private ? 'private' : 'public'}\`\n` +
                `• *Stars*      : \`${r.stargazers_count}\`\n` +
                `• *Forks*      : \`${r.forks_count}\`\n` +
                `• *Bahasa*     : \`${r.language || '-'}\``
            )
            .addUrl('Buka Repo', r.html_url, false)
            .send(m.chat, { quoted: m })
        }

        case 'private':
        case 'public': {
          const name = args[1]
          if (!name) return m.reply('Format: `.git private/public <nama>`')

          const isPrivate = sub === 'private'
          await setVisibility(token, user, name, isPrivate)

          return m.reply(`Visibility \`${name}\` diubah ke \`${isPrivate ? 'private' : 'public'}\`.`)
        }

        case 'whoami': {
          return new Button(conn)
            .setBody(
              `*PROFIL GITHUB*\n\n` +
                `• *Username*  : \`${userInfo.login}\`\n` +
                `• *Nama*      : \`${userInfo.name || '-'}\`\n` +
                `• *Bio*       : \`${userInfo.bio || '-'}\`\n` +
                `• *Public Repo*: \`${userInfo.public_repos}\`\n` +
                `• *Followers* : \`${userInfo.followers}\`\n` +
                `• *Following* : \`${userInfo.following}\``
            )
            .addUrl('Buka Profile', userInfo.html_url, false)
            .send(m.chat, { quoted: m })
        }

        case 'ratelimit': {
          const rl = await getRateLimit(token)
          const core = rl.resources.core
          const resetDate = new Date(core.reset * 1000).toLocaleString('id-ID')
          return m.reply(
            `*RATE LIMIT GITHUB API*\n\n` +
              `• *Limit* : \`${core.limit}\`\n` +
              `• *Sisa*  : \`${core.remaining}\`\n` +
              `• *Reset* : \`${resetDate}\``
          )
        }

        case 'search': {
          const query = args.slice(1).join(' ')
          if (!query) return m.reply('Format: `.git search <keyword>`')

          const results = await searchRepos(token, query)
          if (!results.length) return m.reply('Tidak ada hasil pencarian.')

          let txt = `*HASIL PENCARIAN ("${query}")*\n\n`
          results.forEach((r, i) => {
            txt += `${i + 1}. *${r.full_name}* (⭐ ${r.stargazers_count})\n   ${r.html_url}\n\n`
          })

          return m.reply(txt.trim())
        }

        case 'star':
        case 'unstar': {
          const target = args[1]
          if (!target) return m.reply(`Format: \`.git ${sub} <owner/repo atau nama>\``)

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          if (sub === 'star') await starRepo(token, o, r)
          else await unstarRepo(token, o, r)

          return m.reply(`${sub === 'star' ? 'Berhasil star' : 'Berhasil unstar'}: \`${o}/${r}\``)
        }

        case 'fork': {
          const target = args[1]
          if (!target) return m.reply('Format: `.git fork <owner/repo>`')

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          const forked = await forkRepo(token, o, r)

          return new Button(conn)
            .setBody(`*FORK SUCCESS*\n\n\`${forked.full_name}\``)
            .addUrl('Buka Repo', forked.html_url, false)
            .send(m.chat, { quoted: m })
        }

        case 'branches': {
          const target = args[1]
          if (!target) return m.reply('Format: `.git branches <nama>`')

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          const branches = await listBranches(token, o, r)
          if (!branches.length) return m.reply('Tidak ada branch ditemukan.')

          return m.reply(
            `*BRANCHES (${o}/${r})*\n\n` +
              branches.map(b => `• \`${b.name}\``).join('\n')
          )
        }

        case 'commits': {
          const target = args[1]
          if (!target) return m.reply('Format: `.git commits <nama>`')

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          const commits = await listCommits(token, o, r)
          if (!commits.length) return m.reply('Belum ada commit.')

          let txt = `*COMMITS TERBARU (${o}/${r})*\n\n`
          commits.forEach(c => {
            const msg = c.commit.message.split('\n')[0]
            const author = c.commit.author.name
            txt += `• ${msg} (_${author}_)\n`
          })

          return m.reply(txt.trim())
        }

        case 'readme': {
          const target = args[1]
          if (!target) return m.reply('Format: `.git readme <nama>`')

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          const content = await getReadme(token, o, r)

          if (content.length > 3500) {
            return conn.sendMessage(
              m.chat,
              {
                document: Buffer.from(content, 'utf-8'),
                mimetype: 'text/markdown',
                fileName: 'README.md',
                caption: `README \`${o}/${r}\``
              },
              { quoted: m }
            )
          }

          return m.reply(content)
        }

        case 'download': {
          const target = args[1]
          if (!target) return m.reply('Format: `.git download <nama> [branch]`')

          const { owner: o, repo: r } = parseOwnerRepo(target, user)
          const branch = args[2] || 'main'

          await m.react('⏳')
          const zipBuffer = await downloadRepoZip(token, o, r, branch)
          await m.react('✅')

          return conn.sendMessage(
            m.chat,
            {
              document: zipBuffer,
              mimetype: 'application/zip',
              fileName: `${r}-${branch}.zip`,
              caption: `\`${o}/${r}\` (Branch: ${branch})`
            },
            { quoted: m }
          )
        }

        default:
          return m.reply('Subcommand tidak dikenali. Ketik `.git` untuk melihat menu pilihan.')
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message
      return m.reply('Error: ' + msg)
    }
  }
}
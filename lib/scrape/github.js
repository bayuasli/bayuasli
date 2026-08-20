import axios from 'axios'
import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs'

const GH_API = 'https://api.github.com'

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}

export async function getAuthUser(token) {
  const { data } = await axios.get(`${GH_API}/user`, { headers: getHeaders(token) })
  return data
}

export async function listRepos(token) {
  const { data } = await axios.get(`${GH_API}/user/repos`, {
    headers: getHeaders(token),
    params: { per_page: 100, sort: 'updated' }
  })
  return data
}

export async function createRepo(token, name, isPrivate, description) {
  const { data } = await axios.post(
    `${GH_API}/user/repos`,
    { name, private: isPrivate, description, auto_init: true },
    { headers: getHeaders(token) }
  )
  return data
}

export async function deleteRepo(token, owner, repo) {
  await axios.delete(`${GH_API}/repos/${owner}/${repo}`, { headers: getHeaders(token) })
}

export async function renameRepo(token, owner, oldName, newName) {
  const { data } = await axios.patch(
    `${GH_API}/repos/${owner}/${oldName}`,
    { name: newName },
    { headers: getHeaders(token) }
  )
  return data
}

export async function getRepo(token, owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}`, { headers: getHeaders(token) })
  return data
}

export async function setVisibility(token, owner, repo, isPrivate) {
  const { data } = await axios.patch(
    `${GH_API}/repos/${owner}/${repo}`,
    { private: isPrivate },
    { headers: getHeaders(token) }
  )
  return data
}

export async function ensureRepo(token, owner, repo) {
  try {
    await axios.get(`${GH_API}/repos/${owner}/${repo}`, { headers: getHeaders(token) })
  } catch {
    await axios.post(
      `${GH_API}/user/repos`,
      { name: repo, private: false, auto_init: true },
      { headers: getHeaders(token) }
    )
    await new Promise(r => setTimeout(r, 2000))
  }
}

export async function getRateLimit(token) {
  const { data } = await axios.get(`${GH_API}/rate_limit`, { headers: getHeaders(token) })
  return data
}

export async function searchRepos(token, query) {
  const { data } = await axios.get(`${GH_API}/search/repositories`, {
    headers: getHeaders(token),
    params: { q: query, per_page: 10, sort: 'stars', order: 'desc' }
  })
  return data.items
}

export async function starRepo(token, owner, repo) {
  await axios.put(`${GH_API}/user/starred/${owner}/${repo}`, {}, { headers: getHeaders(token) })
}

export async function unstarRepo(token, owner, repo) {
  await axios.delete(`${GH_API}/user/starred/${owner}/${repo}`, { headers: getHeaders(token) })
}

export async function forkRepo(token, owner, repo) {
  const { data } = await axios.post(`${GH_API}/repos/${owner}/${repo}/forks`, {}, { headers: getHeaders(token) })
  return data
}

export async function listBranches(token, owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}/branches`, { headers: getHeaders(token) })
  return data
}

export async function listCommits(token, owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}/commits`, {
    headers: getHeaders(token),
    params: { per_page: 10 }
  })
  return data
}

export async function getReadme(token, owner, repo) {
  const { data } = await axios.get(`${GH_API}/repos/${owner}/${repo}/readme`, { headers: getHeaders(token) })
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

export async function downloadRepoZip(token, owner, repo, branch = 'main') {
  const res = await axios.get(`${GH_API}/repos/${owner}/${repo}/zipball/${branch}`, {
    headers: getHeaders(token),
    responseType: 'arraybuffer'
  })
  return Buffer.from(res.data)
}

async function getFileSha(token, owner, repo, filePath) {
  try {
    const res = await axios.get(`${GH_API}/repos/${owner}/${repo}/contents/${filePath}`, { headers: getHeaders(token) })
    return res.data.sha
  } catch {
    return null
  }
}

export async function uploadFile(token, owner, repo, filePath, content) {
  const sha = await getFileSha(token, owner, repo, filePath)
  const body = {
    message: `upload: ${filePath}`,
    content: content.toString('base64'),
    branch: 'main'
  }
  if (sha) body.sha = sha

  await axios.put(`${GH_API}/repos/${owner}/${repo}/contents/${filePath}`, body, { headers: getHeaders(token) })
}
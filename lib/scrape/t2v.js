import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const API = "https://t2v.aritek.app";
const SIGN = "68d6165b72a7f2d8d17b0dc6fe9691abdf77c583";
const VERSION_CODE = 85;
const UA = "okhttp/4.12.0";
const DEVICE_FILE = path.join(process.cwd(), 'tmp', '.device_id');
const TOKEN_FILE = path.join(process.cwd(), 'tmp', '.token_cache');

export function getDeviceId() {
  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
  if (fs.existsSync(DEVICE_FILE)) {
    return fs.readFileSync(DEVICE_FILE, 'utf8').trim();
  }
  const id = "sniff_" + crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(DEVICE_FILE, id);
  return id;
}

async function apiFetch(url, options = {}, deviceId, token) {
  const headers = {
    'User-Agent': UA,
    'versionCode': String(VERSION_CODE),
    'Ctry-Target': 'others',
    'Device-Id': deviceId,
    'Sign': SIGN,
    ...(options.headers || {})
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

export async function getToken(deviceId) {
  if (fs.existsSync(TOKEN_FILE)) {
    const cached = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    if (cached.expires > Date.now() && cached.deviceId === deviceId) {
      return cached.token;
    }
  }
  const data = await apiFetch(API + '/api/v1/user/info', { method: 'GET' }, deviceId, null);
  const token = data.data.token;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({
    token: token,
    deviceId: deviceId,
    expires: Date.now() + 3600000
  }));
  return token;
}

export async function generateVideo(prompt, deviceId, token) {
  const body = {
    prompt: prompt,
    versionCode: VERSION_CODE,
    deviceID: deviceId,
    isPremium: 1,
    ctry_target: "others",
    used: [],
    aspect_ratio: "16:9",
    ai_sound: 0
  };

  const res = await apiFetch(API + '/api/v3/video/t2v', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, deviceId, token);

  const url = res.data?.url;
  if (!url) throw new Error('No video URL');

  const videoRes = await fetch(url);
  if (!videoRes.ok) throw new Error('Download failed: HTTP ' + videoRes.status);

  return Buffer.from(await videoRes.arrayBuffer());
}

export function resetDevice() {
  if (fs.existsSync(DEVICE_FILE)) fs.unlinkSync(DEVICE_FILE);
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
}
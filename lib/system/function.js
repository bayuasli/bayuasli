import axios from "axios";
import http from "http";
import https from "https";
import { toBuffer } from "baileys";
import { fileTypeFromBuffer } from "file-type";

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

class Func {
  isUrl(url) {
    const pattern =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/gi;
    return pattern.test(url);
  }

  pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  randomInt(min, max) {
    const ceilMin = Math.ceil(min);
    const floorMax = Math.floor(max);
    return Math.floor(Math.random() * (floorMax - ceilMin + 1)) + ceilMin;
  }

  randomStr(length = 8) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  }

  runtime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? `${d} ${d === 1 ? "day, " : "days, "}` : "";
    const hDisplay = h > 0 ? `${h} ${h === 1 ? "hour, " : "hours, "}` : "";
    const mDisplay = m > 0 ? `${m} ${m === 1 ? "minute, " : "minutes, "}` : "";
    const sDisplay = s > 0 ? `${s} ${s === 1 ? "second" : "seconds"}` : "";

    return dDisplay + hDisplay + mDisplay + sDisplay;
  }

  ago(time) {
    const ts = new Date(time).getTime();
    const now = Date.now();
    const diff = Math.floor((now - ts) / 1000);

    const m = Math.floor(diff / 60);
    const h = Math.floor(diff / 3600);
    const d = Math.floor(diff / 86400);
    const mn = Math.floor(diff / 2592000);
    const y = Math.floor(diff / 31536000);

    if (diff < 60) return `${diff} detik yang lalu`;
    if (m < 60) return `${m} menit yang lalu`;
    if (h < 24) return `${h} jam yang lalu`;
    if (d < 30) return `${d} hari yang lalu`;
    if (mn < 12) return `${mn} bulan yang lalu`;
    return `${y} tahun yang lalu`;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async withTimeout(promise, ms, message = "Operasi timeout") {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async retry(fn, attempts = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1) await this.sleep(delayMs);
      }
    }
    throw lastError;
  }

  async fetchJson(url, options = {}) {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
      },
      httpAgent,
      httpsAgent,
      ...options,
    });
    return res.data;
  }

  async fetchBuffer(url, options = {}) {
    const response = await axios.request({
      method: options.method || "get",
      url,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
        ...(options.headers || {}),
      },
      responseType: "stream",
      data: options.data || null,
      httpAgent,
      httpsAgent,
      ...options,
    });

    const buffer = await toBuffer(response.data);
    const match = response.headers["content-disposition"]?.match(
      /filename=(?:(?:"|')(.*?)(?:"|')|([^"'\s]+))/,
    );

    const filename = decodeURIComponent(match?.[1] || match?.[2] || "") || null;
    const filetype = await fileTypeFromBuffer(buffer);
    const mimetype = filetype?.mime || "application/octet-stream";
    const ext = filetype?.ext || "bin";

    return { data: buffer, filename, mimetype, ext };
  }

  async getBuffer(url, options = {}) {
    const res = await axios.get(url, {
      headers: {
        DNT: 1,
        "Upgrade-Insecure-Request": 1,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
      },
      responseType: "arraybuffer",
      httpAgent,
      httpsAgent,
      ...options,
    });
    return res.data;
  }
}

export default new Func();

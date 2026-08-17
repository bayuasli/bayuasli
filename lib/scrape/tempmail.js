const randomStr = (len = 12) =>
  Math.random()
    .toString(36)
    .substring(2, 2 + len);

class TempMailClient {
  constructor() {
    this.base = "https://api.internal.temp-mail.io/api/v3/";
  }

  async _call(method, path, body = null, query = {}) {
    const url = new URL(this.base + path);
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) url.searchParams.append(k, v);
    });

    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    };

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();

    if (!res.ok)
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    if (ct.includes("text") || ct.includes("eml")) return text;
    return Buffer.from(text);
  }

  async domains() {
    return this._call("GET", "domains");
  }

  async create({ name, domain, token } = {}) {
    let availableDomains = ["tempmail.com"];

    try {
      const resp = await this.domains();
      if (Array.isArray(resp?.domains) && resp.domains.length > 0) {
        availableDomains = resp.domains.map((d) => d.name).filter(Boolean);
      }
    } catch {}

    if (!domain || !domain.includes(".")) {
      domain =
        availableDomains[Math.floor(Math.random() * availableDomains.length)];
    }

    return this._call("POST", "email/new", {
      name: name?.trim() || `user${Math.floor(Math.random() * 999999)}`,
      domain: domain.trim(),
      token: token || `token_${randomStr()}`,
    });
  }

  async messages({ email } = {}) {
    if (!email) throw new Error("email required");
    try {
      return await this._call(
        "GET",
        `email/${encodeURIComponent(email)}/messages`,
      );
    } catch (err) {
      if (
        err.message.includes("Email not found") ||
        err.message.includes("101")
      )
        return [];
      throw err;
    }
  }

  async source({ messageId } = {}) {
    if (!messageId) throw new Error("messageId required");
    return this._call("GET", `message/${messageId}/source_code`);
  }

  async download({ messageId } = {}) {
    if (!messageId) throw new Error("messageId required");
    const res = await this._call(
      "GET",
      `message/${messageId}/source_code`,
      null,
      { download: 1 },
    );
    return Buffer.isBuffer(res) ? res : Buffer.from(res);
  }
}

const client = new TempMailClient();

export const tmCreate = (opts = {}) => client.create(opts);
export const tmMessages = (email) => client.messages({ email });
export const tmDomains = () => client.domains();
export const tmSource = (messageId) => client.source({ messageId });
export const tmDownload = (messageId) => client.download({ messageId });

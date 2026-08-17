export default {
  name: "skiplink",
  category: "tools",
  command: ["skiplink", "skipurl", "skip"],
  alias: [],
  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },
  run: async (conn, m, { Func }) => {
    const url = m.args[0];
    if (!url)
      return m.reply(
        "Masukkan URL yang ingin di-bypass.\nContoh: .bypass https://linkvertise.com/...",
      );
    if (!Func.isUrl(url)) return m.reply("URL tidak valid.");

    try {
      if (!global.bypassSessions) global.bypassSessions = new Map();
      const sender = m.sender;
      let session = global.bypassSessions.get(sender);
      const now = Date.now();

      if (!session || !session.sessionToken || now > session.expiresAt) {
        session = await createSession();
        global.bypassSessions.set(sender, session);
      }

      const result = await bypassUrl(url, session);
      if (result.status === "success" && result.result) {
        let msg = `*Link Bypass:*\n${result.result}`;
        if (result.cached) msg += "\n(Cached)";
        if (result.stale) msg += "\n(Stale)";
        if (result.has_access) msg += "\n(Access granted)";
        if (result.rate_limit) {
          msg += `\n*Rate Limit:* Used ${result.rate_limit.used}/${result.rate_limit.max}, Remaining ${result.rate_limit.remaining}, Reset in ${result.rate_limit.windowMinutes} minutes`;
        }
        return m.reply(msg);
      } else {
        let errMsg = result.message || "Gagal bypass link";
        if (result.error) errMsg = result.error;
        return m.reply(`Gagal: ${errMsg}`);
      }
    } catch (e) {
      console.error("Bypass error:", e);
      if (
        e.message &&
        (e.message.includes("401") || e.message.includes("403"))
      ) {
        try {
          const newSession = await createSession();
          global.bypassSessions.set(m.sender, newSession);
          const result = await bypassUrl(url, newSession);
          if (result.status === "success" && result.result) {
            return m.reply(`*Link Bypass:*\n${result.result}`);
          } else {
            return m.reply(
              `Gagal setelah refresh: ${result.message || "Unknown error"}`,
            );
          }
        } catch (e2) {
          return m.reply(`Gagal refresh session: ${e2.message}`);
        }
      }
      return m.reply(`Terjadi error: ${e.message}`);
    }
  },
};

async function createSession() {
  const crypto = await import("crypto");
  const androidId = crypto.default.randomBytes(16).toString("hex");
  const deviceId = crypto.default
    .createHash("sha256")
    .update(`bypasstools:${androidId}`)
    .digest("hex");

  const initRes = await fetch("https://bypass.tools/api/mobile/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      platform: "android",
      appVersion: "1.0.0",
    }),
  });
  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Init failed: ${initRes.status} ${errText}`);
  }
  const initData = await initRes.json();
  if (!initData.sessionToken) {
    throw new Error("No sessionToken in init response");
  }
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  return { deviceId, sessionToken: initData.sessionToken, expiresAt };
}

async function bypassUrl(url, session) {
  const res = await fetch("https://bypass.tools/api/mobile/bypass", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.sessionToken}`,
      "X-Device-ID": session.deviceId,
    },
    body: JSON.stringify({ url, forceRefresh: false }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${res.status} ${errText}`);
  }
  return res.json();
}

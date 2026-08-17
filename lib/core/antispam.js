const SPAM_INTERVAL = 10;
const SPAM_THRESHOLD = 5;
const BAN_DURATION_MS = 10000;

const spamState = new Map();
const banned = new Set();

export function isBanned(sender) {
  return banned.has(sender);
}

export async function trackMessage(conn, m) {
  if (!m.sender || !m.chat) return;

  const now = m.timesTamp || Math.floor(Date.now() / 1000);
  const state = spamState.get(m.sender) || { count: 0, lastTimestamp: 0 };
  const diff = now - state.lastTimestamp;

  if (diff < SPAM_INTERVAL) {
    state.count++;

    if (state.count >= SPAM_THRESHOLD && !banned.has(m.sender)) {
      banned.add(m.sender);
      state.count = 0;

      setTimeout(() => {
        banned.delete(m.sender);
        conn
          .sendMessage(m.chat, { react: { text: "✅", key: m.key } })
          .catch(() => {});
      }, BAN_DURATION_MS);

      await m.reply(
        "⚠️ Kamu terlalu cepat mengirim pesan. Ditahan sementara 10 detik.",
      );
    }
  } else {
    state.count = 0;
  }

  state.lastTimestamp = now;
  spamState.set(m.sender, state);
}

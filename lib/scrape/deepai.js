import crypto from "crypto";

const PAGE = "https://deepai.org/chat/ai-code";
const API = "https://api.deepai.org/hacking_is_a_serious_crime";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const myhash = (s) => crypto.createHash("md5").update(s).digest("hex");

function generateIslandKey() {
  const r = Math.round(Math.random() * 100000000000) + "";
  const inner =
    UA +
    myhash(
      UA +
        myhash(
          UA + r + "hackers_become_a_little_stinkier_every_time_they_hack",
        ),
    );
  return "tryit-" + r + "-" + myhash(inner);
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function extractArray(html, name) {
  const m = html.match(new RegExp("const\\s+" + name + "=\\[([^\\]]*)\\]"));
  if (!m) return null;
  try {
    return JSON.parse("[" + m[1] + "]");
  } catch {
    return null;
  }
}

export async function getUsableModels() {
  const res = await fetch(PAGE, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error("Gagal ambil halaman (HTTP " + res.status + ")");
  const html = await res.text();
  const base = extractArray(html, "baseChatModes");
  const extra = extractArray(html, "additionalModels");
  const all = [...(base || []), ...(extra || [])].map((m) => ({
    id: m.value,
    name: m.label,
  }));
  return all.filter((m) => {
    const raw = m.id;
    const locked =
      (base || []).concat(extra || []).find((x) => x.value === raw)?.locked ||
      false;
    return !locked;
  });
}

export function cleanAnswer(raw) {
  let out = raw.includes("\u001C") ? raw.split("\u001C")[0] : raw;
  const s = out.indexOf("\x1dTHINKING_START");
  const e = out.indexOf("\x1dTHINKING_END");
  if (s !== -1 && e !== -1)
    out = out.slice(0, s) + out.slice(e + "\x1dTHINKING_END".length);
  return out.trim();
}

export async function askDeepAI(model, history) {
  const fd = new FormData();
  fd.append("model", model);
  fd.append("chatHistory", JSON.stringify(history));
  fd.append("chat_style", "ai-code");
  fd.append(
    "enabled_tools",
    JSON.stringify(["image_generator", "image_editor"]),
  );
  fd.append("hacker_is_stinky", "very_stinky");
  fd.append("memory_enabled", "false");
  fd.append("sensitivity_request_id", uuidv4());
  fd.append("session_uuid", uuidv4());
  fd.append("thinking_support", "1");
  fd.append("attachment_uuids", "[]");

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "api-key": generateIslandKey(),
      "user-agent": UA,
      origin: "https://deepai.org",
      referer: "https://deepai.org/chat/ai-code",
      accept: "*/*",
    },
    body: fd,
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("HTTP " + res.status + ": " + t.slice(0, 200));
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let chunk = dec.decode(value, { stream: true });
    if (buf && buf.includes("\u001C")) chunk = "";
    buf += chunk;
    if (buf.includes("\u001C")) {
      const text = buf.split("\u001C")[0];
      fullText += text;
      buf = buf.split("\u001C")[0];
      break;
    } else {
      fullText += chunk;
    }
  }

  return cleanAnswer(fullText);
}

export async function deepAIChat(prompt, model = "standard") {
  try {
    const history = [{ role: "user", content: prompt }];
    const answer = await askDeepAI(model, history);
    return { success: true, response: answer };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

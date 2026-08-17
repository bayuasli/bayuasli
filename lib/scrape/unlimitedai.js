import crypto from "crypto";

const API = "https://app.unlimitedai.chat/api/chat";
const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function buildCookie(deviceId, chatId) {
  return `NEXT_LOCALE=id; u_device_id=${deviceId}; home_chat_id=${chatId};`;
}

export async function unlimitedChat(prompt) {
  const chatId = crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  const messages = [
    {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      parts: [{ type: "text", text: prompt }],
      createdAt: new Date().toISOString(),
    },
  ];

  const body = {
    chatId,
    messages,
    selectedChatModel: "chat-model-reasoning",
    selectedCharacter: null,
    selectedStory: null,
    deviceId,
    locale: "id",
  };

  const headers = {
    "sec-ch-ua-platform": '"Android"',
    "user-agent": UA,
    "sec-ch-ua":
      '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "content-type": "application/json",
    "sec-ch-ua-mobile": "?1",
    "x-next-intl-locale": "id",
    accept: "*/*",
    origin: "https://app.unlimitedai.chat",
    referer: "https://app.unlimitedai.chat/id",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    cookie: buildCookie(deviceId, chatId),
    priority: "u=1, i",
  };

  const response = await fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { status: false, error: await response.text() };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        if (json.type === "delta" && typeof json.delta === "string") {
          answer += json.delta;
        }
      } catch {}
    }
  }

  return { status: true, answer };
}

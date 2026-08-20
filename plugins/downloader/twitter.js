async function twitterDownloader(url) {
  try {
    const res1 = await fetch("https://ssstwitter.com/id", {
      headers: { "user-agent": "Mozilla/5.0" },
    });

    const html = await res1.text();

    const match = html.match(/include-vals="([^"]+)"/);
    if (!match) throw "Token tidak ditemukan";

    const vals = match[1];

    const tt = vals.match(/tt:'(.*?)'/)?.[1];
    let ts = vals.match(/ts:(\d+)/)?.[1];

    if (!ts) ts = Math.floor(Date.now() / 1000);
    if (!tt) throw "TT tidak ditemukan";

    const body = new URLSearchParams({
      id: url,
      locale: "id",
      tt: tt,
      ts: ts,
      source: "form",
    });

    const res2 = await fetch("https://ssstwitter.com/id", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "hx-request": "true",
        "hx-target": "target",
        "hx-current-url": "https://ssstwitter.com/id",
        "user-agent": "Mozilla/5.0",
      },
      body: body,
    });

    const result = await res2.text();

    const links = [];
    const regex = /<a[^>]+class="[^"]*download-btn[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    let m;
    while ((m = regex.exec(result)) !== null) {
      const tag = m[0];

      const quality = (tag.match(/<span>(.*?)<\/span>/)?.[1] || "")
        .replace(/<[^>]+>/g, "")
        .replace("Download", "")
        .replace(/\s+/g, " ")
        .trim();

      let urlMatch = tag.match(/data-directurl="([^"]+)"/)?.[1];
      if (!urlMatch || urlMatch === "") {
        urlMatch = tag.match(/href="([^"]+)"/)?.[1];
      }

      if (!urlMatch || !quality) continue;

      links.push({ quality: quality, url: urlMatch });
    }

    links.sort((a, b) => {
      const qa = parseInt(a.quality) || 0;
      const qb = parseInt(b.quality) || 0;
      return qb - qa;
    });

    return { status: true, data: links };
  } catch (err) {
    return { status: false, error: err.toString() };
  }
}

export default {
  name: "twitter",
  category: "downloader",
  command: ["twitdl", "twitterdl", "twtdl"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m) => {
    const url = m.text?.trim();
    if (!url) {
      return m.reply(
        "Masukkan link Twitter/X.\nContoh: .twitdl https://x.com/i/status/123456789",
      );
    }

    try {
      await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const result = await twitterDownloader(url);

      if (!result.status || !result.data || result.data.length === 0) {
        await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        return m.reply(
          "Gagal download: " + (result.error || "Tidak ada link ditemukan"),
        );
      }

      const best = result.data[0];

      const response = await fetch(best.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          caption: "Quality: " + best.quality + "\nSource: ssstwitter.com",
        },
        { quoted: m },
      );

      await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error("[twitdl]", e);
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      return m.reply("Error: " + e.message);
    }
  },
};

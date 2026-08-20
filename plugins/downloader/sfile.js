import * as cheerio from "cheerio";

const sfile = {
  createHeaders: (referer) => ({
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Not/A)Brand";v="8", "Chromium";v="137", "Google Chrome";v="137"',
    dnt: "1",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    Referer: referer,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  }),

  extractCookies: (headers) => {
    const raw = headers.get("set-cookie");
    if (!raw) return "";
    return raw
      .split(",")
      .map((c) => c.split(";")[0])
      .join("; ");
  },

  extractMetadata: ($) => {
    const m = {};
    m.filename = $(".overflow-hidden img").attr("alt")?.trim();
    m.mimetype = $(".divide-y span").first().text().trim();
    m.upload_date = $(".divide-y .font-semibold").eq(2).text().trim();
    m.download_count = $(".divide-y .font-semibold").eq(1).text().trim();
    m.author_name = $(".divide-y a").first().text().trim();
    return m;
  },

  makeRequest: async (u, o = {}) => {
    const res = await fetch(u, o);
    return res;
  },

  search: async (query, page = 1) => {
    const res = await fetch(
      `https://sfile.co/search.php?q=${query}&page=${page}`,
    );
    const $ = cheerio.load(await res.text());
    const result = [];

    $(".group.px-2").each((_, el) => {
      const title = $(el).find(".min-w-0 a").text().trim();
      const link = $(el).find("a").attr("href");
      const elm = $(el).find(".mt-1").text().split("•");

      if (link)
        result.push({
          title,
          size: elm[0]?.trim(),
          upload_at: elm[1]?.trim(),
          link,
        });
    });

    return result;
  },

  download: async (url, resultBuffer = false) => {
    try {
      let h = sfile.createHeaders(url);

      const init = await sfile.makeRequest(url, {
        headers: h,
      });

      if (!init.ok) throw new Error(`Init request gagal (${init.status})`);

      const htmlInit = await init.text();

      const ck = sfile.extractCookies(init.headers);
      if (ck) h.Cookie = ck;

      let $ = cheerio.load(htmlInit);
      const meta = sfile.extractMetadata($);

      const dl = $("#download").attr("data-dw-url");
      if (!dl) throw new Error("Download URL gak ketemu");

      h.Referer = dl;

      const proc = await sfile.makeRequest(dl, {
        headers: h,
      });

      if (!proc.ok) throw new Error(`Process request gagal (${proc.status})`);

      const htmlProc = await proc.text();
      $ = cheerio.load(htmlProc);

      const scr = $("script")
        .map((i, el) => $(el).html())
        .get()
        .join("\n");

      const re =
        /https:\\\/\\\/download\d+\.sfile\.co\\\/downloadfile\\\/\d+\\\/\d+\\\/[a-z0-9]+\\\/[^\s'"]+\.[a-z0-9]+(\?[^"']+)?/gi;
      const mt = scr.match(re);

      if (!mt?.length)
        throw new Error("Link download final gak ketemu di script");

      const fin = mt[0].replace(/\\\//g, "/");

      let download;

      if (resultBuffer) {
        const fileRes = await fetch(fin, { headers: h });

        if (!fileRes.ok)
          throw new Error(`File download gagal (${fileRes.status})`);

        const arrayBuffer = await fileRes.arrayBuffer();
        download = Buffer.from(arrayBuffer);
      } else {
        download = fin;
      }

      return {
        metadata: meta,
        download,
      };
    } catch (e) {
      throw new Error(e.message);
    }
  },
};

export default {
  name: "sfile",
  category: "downloader",
  command: ["sfile", "sfilemobi", "sfilesearch"],
  alias: [],

  settings: {
    owner: false,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
  },

  run: async (conn, m, context) => {
    const { quoted } = context;
    const text = m.text || quoted?.text || "";
    const args = text.split(" ");
    const input = args.join(" ");

    if (!input) {
      return m.reply(
        `SFILE DOWNLOADER\n\n` +
          `Cari: .sfile kata kunci\n` +
          `Download: .sfile https://sfile.co/xxxxx\n\n` +
          `Contoh: .sfile alucard\n` +
          `Contoh: .sfile https://sfile.co/xxxxx`,
      );
    }

    try {
      if (/https:\/\/sfile\.co\//i.test(input)) {
        const res = await sfile.download(input, true);
        if (!res) throw new Error("Tidak dapat mengunduh file");

        const metaText = Object.entries(res.metadata)
          .map(([k, v]) => `• ${k.replace("_", " ")}: ${v}`)
          .join("\n");

        await m.reply(metaText + "\n\nMengirim file...");

        await conn.sendMessage(
          m.chat,
          {
            document: res.download,
            fileName: res.metadata.filename,
            mimetype: res.metadata.mimetype,
          },
          { quoted: m },
        );
      } else {
        const [query, page] = input.split("|");
        const res = await sfile.search(query, page || 1);

        if (!res.length) throw new Error(`Query "${query}" tidak ditemukan`);

        const resultText = res
          .map(
            (v) =>
              `*${v.title}*\nSize: ${v.size}\nUpload: ${v.upload_at}\nLink: ${v.link}`,
          )
          .join("\n\n");

        await m.reply(resultText);
      }
    } catch (err) {
      await m.reply(`Error: ${err.message}`);
    }
  },
};

import axios from "axios";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

function extractPkg(url) {
  const last = url?.split("?")[0].replace(/\/+$/, "").split("/").pop();
  return last?.includes(".") ? last : null;
}

export async function apkSearch(query) {
  const res = await axios.get(
    `https://apkpure.com/id/search?q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": UA, "Accept-Language": "id-ID,id;q=0.9" },
      timeout: 15000,
    },
  );

  const $ = cheerio.load(res.data);
  const results = [];

  $(".search-res dl, .search-res li").each((_, el) => {
    const href = $(el).find("a.dd, a").first().attr("href");
    if (!href || href.includes("/howto/") || !href.includes("/id/")) return;

    const link = href.startsWith("http") ? href : "https://apkpure.com" + href;
    const title = $(el).find(".p1").text().replace(/\s+/g, " ").trim();
    const pkg = extractPkg(link);

    if (title && pkg && !results.some((r) => r.pkg === pkg)) {
      results.push({
        title,
        pkg,
        url: link,
        apkUrl: `https://d.apkpure.com/b/APK/${pkg}?version=latest`,
        xapkUrl: `https://d.apkpure.com/b/XAPK/${pkg}?version=latest`,
      });
    }
  });

  return results;
}

export async function apkDownload(target) {
  let pkg = null;
  let title = target;

  if (/^https?:\/\//.test(target)) {
    pkg = extractPkg(target);
  } else if (target.includes(".")) {
    pkg = target;
  } else {
    const results = await apkSearch(target);
    if (!results.length) throw new Error("Tidak ada hasil untuk: " + target);
    pkg = results[0].pkg;
    title = results[0].title;
  }

  if (!pkg) throw new Error("Package name tidak ditemukan.");

  for (const type of ["APK", "XAPK"]) {
    try {
      const url = `https://d.apkpure.com/b/${type}/${pkg}?version=latest`;
      const res = await axios.get(url, {
        headers: { "User-Agent": UA },
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 150 * 1024 * 1024,
      });

      const buffer = Buffer.from(res.data);
      if (!buffer.length) continue;

      const ext = type.toLowerCase();
      const mime =
        type === "APK"
          ? "application/vnd.android.package-archive"
          : "application/zip";
      const filename = `${pkg}.${ext}`;
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

      return { buffer, filename, mime, sizeMB, title, pkg, type };
    } catch {
      continue;
    }
  }

  throw new Error("Gagal download APK/XAPK untuk: " + pkg);
}

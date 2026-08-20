import axios from "axios";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export async function searchSongs(query) {
  const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });

  if (response.status !== 200) return [];

  const sections = response.data?.response?.sections || [];
  const songs = [];
  const seenIds = new Set();

  for (const section of sections) {
    const hits = section.hits || [];
    for (const hit of hits) {
      const result = hit.result || {};
      const hitType = hit.type;
      const _type = result._type;

      if (hitType === "song" || _type === "song") {
        const songId = result.id;
        if (songId && !seenIds.has(songId)) {
          seenIds.add(songId);
          songs.push({
            title: result.title,
            artist: result.artist_names,
            path: result.path,
            image: result.header_image_url,
            release_date: result.release_date_for_display,
          });
        }
      }
    }
  }
  return songs;
}

export async function getLyrics(songPath) {
  const url = songPath.startsWith("/")
    ? `https://genius.com${songPath}`
    : songPath;
  const response = await axios.get(url, { headers: HEADERS, timeout: 10000 });

  if (response.status !== 200) return null;

  const $ = cheerio.load(response.data);
  const containers = $('div[data-lyrics-container="true"]');
  const lyricsList = [];

  containers.each((i, elem) => {
    const container = $(elem);
    container.find('[data-exclude-from-selection="true"]').remove();
    container.find("br").replaceWith("\n");
    lyricsList.push(container.text());
  });

  return lyricsList.join("\n").trim();
}

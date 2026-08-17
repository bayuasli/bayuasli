import yts from "yt-search";

export async function youtubeSearch(query) {
  try {
    const result = await yts(query);
    return { success: true, results: result.videos || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function spotifyDownload(spotifyUrl) {
  const res = await fetch('https://gamepvz.com/api/download/get-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ url: spotifyUrl })
  });

  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || 'Gagal ambil data');

  const b64 = new URLSearchParams(data.originalVideoUrl.split('?')[1]).get('url');
  const directUrl = Buffer.from(b64, 'base64').toString('utf8');

  return {
    title: data.title,
    artist: data.authorName,
    cover: data.coverUrl,
    duration: data.duration,
    download: directUrl
  };
}
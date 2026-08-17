import https from 'https';
import zlib from 'zlib';

const agent = new https.Agent({ keepAlive: true });

function request(url, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: body ? { ...headers, 'content-length': Buffer.byteLength(body) } : headers,
      agent,
      maxHeaderSize: 1048576
    };

    const req = https.request(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const newHeaders = { ...headers };
        delete newHeaders.host;
        return resolve(request(res.headers.location, { method, headers: newHeaders, body }));
      }

      const chunks = [];
      const encoding = res.headers['content-encoding'];
      const stream =
        encoding === 'gzip'    ? res.pipe(zlib.createGunzip()) :
        encoding === 'br'      ? res.pipe(zlib.createBrotliDecompress()) :
        encoding === 'deflate' ? res.pipe(zlib.createInflate()) :
        res;

      stream.on('data', c => chunks.push(c));
      stream.on('end', () => resolve({ text: Buffer.concat(chunks).toString('utf8'), headers: res.headers, status: res.statusCode }));
      stream.on('error', reject);
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractItemStruct(html) {
  const apiMatch = html.match(/<script id="api-data"[^>]*>([\s\S]*?)<\/script>/);
  if (apiMatch) {
    try {
      const j = JSON.parse(apiMatch[1]);
      let s = j?.videoDetail?.itemInfo?.itemStruct || j?.itemInfo?.itemStruct;
      if (s) return s;
      if (j?.ItemModule) {
        const firstId = Object.keys(j.ItemModule)[0];
        if (firstId && j.ItemModule[firstId]) return j.ItemModule[firstId];
      }
    } catch (_) {}
  }

  const uniMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (uniMatch) {
    try {
      const j = JSON.parse(uniMatch[1]);
      const defaultScope = j?.__DEFAULT_SCOPE__ || {};
      for (const key of Object.keys(defaultScope)) {
        const s = defaultScope[key]?.itemInfo?.itemStruct;
        if (s) return s;
      }
    } catch (_) {}
  }

  return null;
}

export async function tiktokDownload(url) {
  const { text } = await request(url, {
    headers: {
      'sec-ch-ua': '"Mises";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-user': '?1',
      'sec-fetch-dest': 'document',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
      'priority': 'u=0, i'
    }
  });

  const detail = extractItemStruct(text);
  if (!detail) throw new Error('Gagal ambil data');

  const isImage = !!detail.imagePost;
  let download = [];
  if (isImage) {
    download = (detail.imagePost.images || []).reduce((acc, img) => {
      return acc.concat(img?.imageURL?.urlList || []);
    }, []);
  } else {
    download = [detail.video?.downloadAddr, detail.video?.playAddr].filter(Boolean);
  }

  return {
    id: detail.id || detail.aweme_id || null,
    isVideo: !isImage,
    title: detail.desc || detail.suggestedWords?.[0] || '',
    region: detail.locationCreated || null,
    duration: detail.video?.duration || detail.music?.duration || 0,
    cover: detail.video?.cover || detail.video?.originCover || null,
    stats: {
      like: detail.stats?.diggCount || 0,
      views: detail.stats?.playCount || 0,
      share: detail.stats?.shareCount || 0,
      comment: detail.stats?.commentCount || 0,
      collect: detail.stats?.collectCount || 0
    },
    download,
    author: {
      id: detail.author?.id || '',
      username: detail.author?.uniqueId || '',
      nickname: detail.author?.nickname || '',
      avatar: detail.author?.avatarLarger || detail.author?.avatarMedium || detail.author?.avatarThumb || null,
      verified: detail.author?.verified || false,
      followers: detail.authorStats?.followerCount || detail.author?.followerCount || 0
    },
    music: {
      id: detail.music?.id || null,
      title: detail.music?.title || '',
      author: detail.music?.authorName || '',
      url: detail.music?.playUrl || null
    }
  };
}
export function extractSlug(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const cleanPath = pathname.replace(/\/+$/, '');
    const slug = (hostname + cleanPath)
      .replace(/^www\./, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return slug;
  } catch {
    throw new Error('URL tidak valid: ' + url);
  }
}

export async function webtoprompt(targetUrl) {
  const siteSlug = extractSlug(targetUrl);

  const res = await fetch('https://www.gitreverse.com/api/reverse-website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteSlug, targetUrl, stream: true })
  });

  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ': ' + res.statusText);
  }

  const text = await res.text();
  const dataLines = text
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6));

  for (const dataStr of dataLines) {
    try {
      const data = JSON.parse(dataStr);
      if (data.prompt) {
        return {
          prompt: data.prompt,
          designPath: data.designPath || null,
          fromCache: data.fromCache ?? false
        };
      }
    } catch {}
  }

  throw new Error('Tidak ditemukan prompt dalam response SSE');
}

export async function repotoprompt(repoUrl) {
  let cleanRepo = repoUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//, '')
    .replace(/\/+$/, '');

  const res = await fetch('https://www.gitreverse.com/api/reverse-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: cleanRepo })
  });

  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ': ' + res.statusText);
  }

  const data = await res.json();
  if (!data.prompt) {
    throw new Error('Tidak ditemukan prompt dalam response');
  }

  return { prompt: data.prompt };
}
// Resolve a small card icon from an entry link.
// Build time may discover rel=icon / apple-touch-icon. Runtime always has
// same-origin fallbacks, and the card drops to a letter when every URL fails.

const ICON_HTML_LIMIT = 524288;

/**
 * @param {string} rel
 * @returns {'favicon' | 'apple' | ''}
 */
function iconKind(rel) {
  const tokens = rel.toLowerCase().split(/\s+/);
  if (tokens.includes('icon') || tokens.includes('shortcut')) return 'favicon';
  if (
    tokens.includes('apple-touch-icon') ||
    tokens.includes('apple-touch-icon-precomposed')
  ) {
    return 'apple';
  }
  return '';
}

/**
 * @param {string | undefined} sizes
 * @returns {number}
 */
function sizeScore(sizes) {
  if (!sizes) return 0;
  let best = 0;
  for (const part of sizes.split(/\s+/)) {
    const match = /^(\d+)x(\d+)$/i.exec(part);
    if (!match) continue;
    best = Math.max(best, Number(match[1]));
  }
  if (best === 32 || best === 48) return 3;
  if (best >= 16 && best <= 64) return 2;
  if (best > 64 && best <= 192) return 1;
  return 0;
}

/**
 * @param {string} href
 * @param {string} baseUrl
 * @returns {string | undefined}
 */
function absoluteHttpUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/**
 * Pick the best favicon or apple-touch-icon declared in an HTML document.
 * Favicon / rel=icon wins over apple-touch-icon. Returns an absolute http(s) URL.
 * @param {string} html
 * @param {string} baseUrl
 * @returns {string | undefined}
 */
export function pickIconFromHtml(html, baseUrl) {
  if (!html || !baseUrl) return undefined;
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  /** @type {{ url: string, score: number }} */
  let best = { url: '', score: -1 };

  for (const tag of tags) {
    const rel = /\brel\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    if (!rel || !href) continue;
    const relValue = rel[2] ?? rel[3] ?? rel[4] ?? '';
    const hrefValue = href[2] ?? href[3] ?? href[4] ?? '';
    const kind = iconKind(relValue);
    if (!kind) continue;
    const url = absoluteHttpUrl(hrefValue, baseUrl);
    if (!url) continue;
    const sizes = /\bsizes\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const sizeValue = sizes ? (sizes[2] ?? sizes[3] ?? sizes[4] ?? '') : '';
    const score = (kind === 'favicon' ? 10 : 0) + sizeScore(sizeValue);
    if (score > best.score) best = { url, score };
  }

  return best.url || undefined;
}

/**
 * Ordered icon URLs for an entry. Discovered rel=icon first, then the site's
 * well-known favicon and apple-touch-icon. Invalid and duplicate URLs are dropped.
 * @param {string} pageUrl
 * @param {string | undefined} discovered
 * @returns {string[]}
 */
export function iconCandidates(pageUrl, discovered) {
  /** @type {string[]} */
  const urls = [];
  const push = (value) => {
    if (typeof value !== 'string') return;
    const url = absoluteHttpUrl(value.trim(), pageUrl);
    if (!url || urls.includes(url)) return;
    urls.push(url);
  };

  push(discovered);
  try {
    const page = new URL(pageUrl);
    if (page.protocol === 'http:' || page.protocol === 'https:') {
      push(new URL('/favicon.ico', page).href);
      push(new URL('/apple-touch-icon.png', page).href);
    }
  } catch {
    // The entry link is not a URL; callers show the letter placeholder.
  }
  return urls;
}

/**
 * Fetch a page and read its rel=icon / apple-touch-icon. Never throws.
 * @param {string} pageUrl
 * @returns {Promise<string | undefined>}
 */
export async function discoverIcon(pageUrl) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }

  try {
    const response = await fetch(pageUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'yaal-icon-resolver',
      },
    });
    if (!response.ok) return undefined;
    const type = response.headers.get('content-type') || '';
    if (type && !/html|xml/i.test(type)) return undefined;
    const html = (await response.text()).slice(0, ICON_HTML_LIMIT);
    return pickIconFromHtml(html, response.url || pageUrl);
  } catch {
    return undefined;
  }
}

/**
 * Best-effort icon discovery for every tool. Failures leave the tool unchanged
 * so cards still render and fall back in the browser.
 * @param {{ url?: string, icon?: string }[]} tools
 * @returns {Promise<void>}
 */
export async function attachEntryIcons(tools) {
  if (process.env.YAAL_SKIP_ICONS === '1') return;
  const queue = tools.filter((tool) => tool && tool.url);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(8, queue.length) },
    async () => {
      while (cursor < queue.length) {
        const tool = queue[cursor++];
        const icon = await discoverIcon(tool.url || '');
        if (icon) tool.icon = icon;
      }
    }
  );
  await Promise.all(workers);
}

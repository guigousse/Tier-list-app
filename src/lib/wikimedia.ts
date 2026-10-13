/** Picture found on Wikimedia Commons for a card name. */
export type WikiImage = {
  /** Thumbnail URL (about 600 px wide), downloaded when the user picks it. */
  url: string;
  /** "Author · Licence", to credit the picture. */
  credit: string;
  /** Commons page describing the file. */
  page: string;
};

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA = 'https://fr.wikipedia.org/w/api.php';
const HEADERS = { 'Api-User-Agent': 'Tiercraft/1.0 (https://tiercraft.vercel.app)' };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TIMEOUT_MS = 10000;

type ImageInfo = {
  thumburl?: string;
  url: string;
  mime: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value?: string }>;
};
type Page = { title: string; index?: number; imageinfo?: ImageInfo[]; pageimage?: string };
type QueryResponse = { query?: { pages?: Record<string, Page> } };

async function api(base: string, params: Record<string, string>): Promise<QueryResponse> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}?${query}`, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
    return (await res.json()) as QueryResponse;
  } finally {
    clearTimeout(timer);
  }
}

const IMAGE_INFO = {
  prop: 'imageinfo',
  iiprop: 'url|mime|extmetadata',
  iiurlwidth: '600',
  iiextmetadatafilter: 'Artist|LicenseShortName',
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function toImages(pages: Page[]): WikiImage[] {
  return pages.flatMap((p) => {
    const info = p.imageinfo?.[0];
    if (!info || !IMAGE_TYPES.includes(info.mime)) return [];
    const artist = stripHtml(info.extmetadata?.Artist?.value).slice(0, 60);
    const licence = stripHtml(info.extmetadata?.LicenseShortName?.value);
    return [{ url: info.thumburl ?? info.url, credit: [artist, licence].filter(Boolean).join(' · '), page: info.descriptionurl }];
  });
}

/** Card name without its leading emoji, e.g. "🍕 Pizza" → "Pizza". */
export function searchTerm(label: string): string {
  return label.replace(/^[\p{Extended_Pictographic}‍️\s]+/u, '').trim();
}

/**
 * Pictures for `label`: the main picture of the matching French Wikipedia article
 * first (usually the most relevant), then Commons search results.
 */
export async function findImages(label: string): Promise<WikiImage[]> {
  const term = searchTerm(label);
  if (!term) return [];

  const [article, search] = await Promise.allSettled([
    api(WIKIPEDIA, { action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: term }),
    api(COMMONS, { action: 'query', generator: 'search', gsrsearch: `${term} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '8', ...IMAGE_INFO }),
  ]);

  const images: WikiImage[] = [];
  const fileName = article.status === 'fulfilled' ? Object.values(article.value.query?.pages ?? {})[0]?.pageimage : undefined;
  if (fileName) {
    try {
      const file = await api(COMMONS, { action: 'query', titles: `File:${fileName}`, ...IMAGE_INFO });
      images.push(...toImages(Object.values(file.query?.pages ?? {})));
    } catch {
      // The article picture may not be on Commons: keep the search results.
    }
  }
  if (search.status === 'fulfilled') {
    const pages = Object.values(search.value.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    images.push(...toImages(pages));
  }
  if (images.length === 0 && article.status === 'rejected' && search.status === 'rejected') throw search.reason;

  const seen = new Set<string>();
  return images.filter((img) => !seen.has(img.url) && seen.add(img.url));
}

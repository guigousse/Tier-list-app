import { leadingEmoji } from './emoji';

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
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const WIKIPEDIA = 'https://fr.wikipedia.org/w/api.php';
const HEADERS = { 'Api-User-Agent': 'Tiercraft/1.0 (https://tier-list-app-share-site.vercel.app)' };
// SVG files (flags, logos) come with a PNG thumbnail, which is what gets downloaded.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
/** Wikidata properties holding the most recognisable picture of a thing, best first. */
const WIKIDATA_IMAGES = ['P41', 'P154', 'P18']; // flag, logo, image
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
type Claim = { mainsnak?: { datavalue?: { value?: unknown } } };
type WikidataResponse = {
  search?: { id: string }[];
  entities?: Record<string, { claims?: Record<string, Claim[]> }>;
};

async function api<T = QueryResponse>(base: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}?${query}`, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
    return (await res.json()) as T;
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
    if (!info || !IMAGE_TYPES.includes(info.mime) || (info.mime === 'image/svg+xml' && !info.thumburl)) return [];
    const artist = stripHtml(info.extmetadata?.Artist?.value).slice(0, 60);
    const licence = stripHtml(info.extmetadata?.LicenseShortName?.value);
    return [{ url: info.thumburl ?? info.url, credit: [artist, licence].filter(Boolean).join(' · '), page: info.descriptionurl }];
  });
}

/** Card name without its leading emoji, e.g. "🍕 Pizza" → "Pizza". */
export function searchTerm(label: string): string {
  const emoji = leadingEmoji(label.trim());
  return (emoji ? label.trim().slice(emoji.length) : label).trim();
}

/** Commons file names of the flag, logo and main image of the Wikidata item named `term`. */
async function wikidataFiles(term: string): Promise<string[]> {
  const found = await api<WikidataResponse>(WIKIDATA, {
    action: 'wbsearchentities',
    search: term,
    language: 'fr',
    uselang: 'fr',
    type: 'item',
    limit: '1',
  });
  const id = found.search?.[0]?.id;
  if (!id) return [];
  const entity = await api<WikidataResponse>(WIKIDATA, { action: 'wbgetentities', ids: id, props: 'claims' });
  const claims = entity.entities?.[id]?.claims ?? {};
  return WIKIDATA_IMAGES.flatMap((prop) =>
    (claims[prop] ?? []).slice(0, 1).flatMap((c) => {
      const file = c.mainsnak?.datavalue?.value;
      return typeof file === 'string' ? [file] : [];
    }),
  );
}

/** Image info of Commons files, in the given order. */
async function commonsFiles(names: string[]): Promise<WikiImage[]> {
  if (names.length === 0) return [];
  const res = await api(COMMONS, { action: 'query', titles: names.map((n) => `File:${n}`).join('|'), ...IMAGE_INFO });
  const pages = Object.values(res.query?.pages ?? {});
  const key = (t: string) => t.replace(/^File:/, '').replace(/_/g, ' ');
  const order = names.map((n) => key(n));
  pages.sort((a, b) => order.indexOf(key(a.title)) - order.indexOf(key(b.title)));
  return toImages(pages);
}

/**
 * Pictures for `label`, most representative first: the flag, logo or main image
 * of the matching Wikidata item, the picture of the French Wikipedia article,
 * then Commons search results as a last resort.
 */
export async function findImages(label: string): Promise<WikiImage[]> {
  const term = searchTerm(label);
  if (!term) return [];

  const [wikidata, article, search] = await Promise.allSettled([
    wikidataFiles(term),
    api(WIKIPEDIA, { action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: term }),
    api(COMMONS, { action: 'query', generator: 'search', gsrsearch: `${term} filetype:bitmap|drawing`, gsrnamespace: '6', gsrlimit: '6', ...IMAGE_INFO }),
  ]);
  if (wikidata.status === 'rejected' && article.status === 'rejected' && search.status === 'rejected') throw search.reason;

  const files = wikidata.status === 'fulfilled' ? [...wikidata.value] : [];
  const articleFile = article.status === 'fulfilled' ? Object.values(article.value.query?.pages ?? {})[0]?.pageimage : undefined;
  if (articleFile) files.push(articleFile);

  const images: WikiImage[] = [];
  try {
    images.push(...(await commonsFiles([...new Set(files.map((f) => f.replace(/_/g, ' ')))])));
  } catch {
    // Keep the search results.
  }
  if (search.status === 'fulfilled') {
    const pages = Object.values(search.value.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    images.push(...toImages(pages));
  }

  const seen = new Set<string>();
  return images.filter((img) => !seen.has(img.url) && seen.add(img.url));
}

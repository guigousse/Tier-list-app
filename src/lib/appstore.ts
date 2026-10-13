/** Public App Store API (no key needed): app icons for the templates. */
const LOOKUP = 'https://itunes.apple.com/lookup';
const SEARCH = 'https://itunes.apple.com/search';
const TIMEOUT_MS = 10000;

type Result = { trackId: number; trackName: string; artworkUrl512?: string; artworkUrl100?: string };

async function get(url: string): Promise<Result[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`App Store ${res.status}`);
    return ((await res.json()) as { results?: Result[] }).results ?? [];
  } finally {
    clearTimeout(timer);
  }
}

const artwork = (r: Result) => r.artworkUrl512 ?? r.artworkUrl100;

/**
 * Icon URL of each app, in order (undefined when not found). Apps are looked up by
 * App Store id, or searched by name when they have none.
 */
export async function fetchAppIcons(apps: { id?: number; name: string }[]): Promise<(string | undefined)[]> {
  const ids = apps.map((a) => a.id).filter((id): id is number => Boolean(id));
  const byId = new Map<number, string>();
  if (ids.length) {
    const results = await get(`${LOOKUP}?id=${ids.join(',')}&country=fr&entity=software`);
    results.forEach((r) => artwork(r) && byId.set(r.trackId, artwork(r)!));
  }
  return Promise.all(
    apps.map(async (app) => {
      // An app with an id that isn't found isn't released (yet): searching its name
      // could return another app's icon.
      if (app.id) return byId.get(app.id);
      try {
        const [first] = await get(`${SEARCH}?term=${encodeURIComponent(app.name)}&country=fr&entity=software&limit=1`);
        return first ? artwork(first) : undefined;
      } catch {
        return undefined;
      }
    }),
  );
}

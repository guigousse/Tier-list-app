/**
 * The regions a player can pick, the countries the app speaks the language of first.
 * Another country keeps its phone's region; "worldwide" (null) shows only the lists for all.
 */
export const REGIONS = ['FR', 'BE', 'CH', 'CA', 'LU', 'ES', 'MX', 'AR', 'CO', 'CL', 'GR', 'CY', 'US', 'GB', 'IE', 'AU'] as const;

/** A country's flag: its two letters as regional indicator symbols. */
export function flag(region: string): string {
  return String.fromCodePoint(...[...region.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

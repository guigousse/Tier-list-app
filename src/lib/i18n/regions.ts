/**
 * The regions a player can pick, the countries the app speaks the language of first.
 * Another country keeps its phone's region; "worldwide" (null) shows only the lists for all.
 */
export const REGIONS = ['FR', 'BE', 'CH', 'CA', 'LU', 'ES', 'MX', 'AR', 'CO', 'CL', 'GR', 'CY', 'US', 'GB', 'IE', 'AU'] as const;

/** A country's flag: its two letters as regional indicator symbols. */
export function flag(region: string): string {
  return String.fromCodePoint(...[...region.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Whether a list is put forward to a player of `region` (null: worldwide, the lists for all only). */
export function featuredIn(list: { regions?: string[] }, region: string | null): boolean {
  return !list.regions?.length || (region !== null && list.regions.includes(region));
}

/**
 * Whether a player of `region` may vote on a list (a national election is kept to its
 * country). The server checks again by the phone's network country: this only spares a
 * ranking that would be refused.
 */
export function canVote(list: { voteRegions?: string[] }, region: string | null): boolean {
  return !list.voteRegions?.length || (region !== null && list.voteRegions.includes(region));
}

/**
 * `record[key]` only when the key is really one of its entries: a link to
 * "editor/constructor" or "legal/toString" would otherwise reach the object's own methods
 * and crash the screen.
 */
export function own<T>(record: Record<string, T>, key: string | undefined): T | undefined {
  return key !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
}

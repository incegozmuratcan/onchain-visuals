/** Move a key to the newest position and drop the oldest entries past `limit`. */
export function touchBounded<T>(map: Map<string, T>, key: string, value: T, limit: number) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

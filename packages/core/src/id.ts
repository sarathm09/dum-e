import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Short, URL-safe, lowercase base36 id. Not sortable; use createdAt for ordering. */
export function newId(size = 10): string {
  const bytes = randomBytes(size);
  let out = '';
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** ISO-8601 UTC timestamp with millisecond precision. */
export function now(): string {
  return new Date().toISOString();
}

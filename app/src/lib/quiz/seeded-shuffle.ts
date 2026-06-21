/**
 * Deterministic Fisher–Yates that returns a permutation of [0..n-1].
 * Same (n, seed) → same order, on server and client (no hydration mismatch).
 * Uses a tiny mulberry32 PRNG; no Math.random.
 */
export function seededShuffle(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = (seed >>> 0) || 1;
  const rand = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

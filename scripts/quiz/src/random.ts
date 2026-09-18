export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    const value = state | 0;
    const v1 = Math.imul(value ^ (value >>> 15), value | 1);
    const v2 = Math.imul(v1 ^ (v1 >>> 7), v1 | 61);
    const v3 = (v1 ^ ((v1 + v2) | 0)) | 0;
    return ((v3 ^ (v3 >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(input: readonly T[], seed: string): T[] {
  const result = [...input];
  const random = createRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function newSeed(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return Array.from(values, value => value.toString(36))
      .join("")
      .slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 10);
}

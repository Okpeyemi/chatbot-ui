// Tiny in-memory store for AI-generated images. Survives across requests in a
// single Node process, expires after TTL_MS so memory doesn't grow unbounded.
// For multi-instance deployments, swap this for a real blob store (S3, R2…).

const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

export type StoredImage = {
  data: Uint8Array;
  mediaType: string;
  prompt: string;
  createdAt: number;
};

const images = new Map<string, StoredImage>();

function evictExpired(now: number) {
  for (const [id, img] of images) {
    if (now - img.createdAt > TTL_MS) {
      images.delete(id);
    }
  }
  // Hard cap on entries to bound memory.
  while (images.size > MAX_ENTRIES) {
    const oldest = images.keys().next().value;
    if (!oldest) break;
    images.delete(oldest);
  }
}

export function putImage(id: string, image: Omit<StoredImage, "createdAt">): void {
  evictExpired(Date.now());
  images.set(id, { ...image, createdAt: Date.now() });
}

export function getImage(id: string): StoredImage | undefined {
  evictExpired(Date.now());
  return images.get(id);
}

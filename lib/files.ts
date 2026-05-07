export type AttachedFile = {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  url: string;
};

export async function fileToAttached(file: File): Promise<AttachedFile> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return {
    id: crypto.randomUUID(),
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    size: file.size,
    url,
  };
}

export const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

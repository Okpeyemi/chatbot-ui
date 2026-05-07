import { getImage } from "@/lib/ai/image-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const image = getImage(id);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(image.data as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": image.mediaType,
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}

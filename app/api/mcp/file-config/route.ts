import { loadFileMcpServers } from "@/lib/mcp/file-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const servers = await loadFileMcpServers();
  return Response.json({ servers });
}

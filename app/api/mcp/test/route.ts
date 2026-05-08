import { mcpServerConfigSchema } from "@/lib/mcp/types";
import { connectMcpClient, listMcpTools } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = mcpServerConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Invalid server config",
        issues: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  let close: (() => Promise<void>) | null = null;
  try {
    const conn = await connectMcpClient(parsed.data);
    close = conn.close;
    const tools = await listMcpTools(conn.client);
    return Response.json({
      ok: true,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  } finally {
    if (close) await close();
  }
}

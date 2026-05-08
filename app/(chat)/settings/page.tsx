import { McpSection } from "@/components/settings/mcp/mcp-section";

// /settings is the entry point; for now it shows the MCP section directly.
// We previously used `redirect("/settings/mcp")` here but Next's dev-mode
// performance instrumentation choked on the thrown redirect, raising
// "Failed to execute 'measure' on 'Performance'" — so we just render.
export default function SettingsPage() {
  return <McpSection />;
}

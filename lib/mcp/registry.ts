import type { McpServerConfig } from "./types";

/**
 * Curated list of well-known MCP servers. Picking one in the Settings UI
 * pre-fills the form with a working baseline. Empty `headers` / `env`
 * values mark the spots the user must fill in (typically a token).
 */
export type McpRegistryEntry = {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  /** Short tag rendered as a chip on the card (e.g. "no key", "token"). */
  badge?: string;
  template: Pick<
    McpServerConfig,
    | "name"
    | "transport"
    | "url"
    | "headers"
    | "command"
    | "args"
    | "env"
  >;
  /**
   * Human-friendly hints for the fields the user must fill before saving.
   * Rendered as a banner above the form.
   */
  needs?: { field: string; label: string; how?: string }[];
};

export const MCP_REGISTRY: McpRegistryEntry[] = [
  {
    id: "github-remote",
    name: "GitHub (hosted)",
    description:
      "Search code and issues, open PRs, read repos. Uses GitHub's hosted MCP endpoint — requires a GitHub token.",
    docsUrl: "https://github.com/github/github-mcp-server",
    badge: "token",
    template: {
      name: "github",
      transport: "streamable-http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: { Authorization: "Bearer YOUR_GITHUB_TOKEN" },
    },
    needs: [
      {
        field: "headers.Authorization",
        label: "Replace YOUR_GITHUB_TOKEN with a Personal Access Token",
        how: "Create one at github.com/settings/tokens (classic, scope: repo + read:org).",
      },
    ],
  },
  {
    id: "github-docker",
    name: "GitHub (local Docker)",
    description:
      "Same GitHub MCP server, running locally via Docker. No Copilot needed but Docker must be installed.",
    docsUrl: "https://github.com/github/github-mcp-server",
    badge: "docker",
    template: {
      name: "github",
      transport: "stdio",
      command: "docker",
      args: [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server",
      ],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
    },
    needs: [
      {
        field: "env.GITHUB_PERSONAL_ACCESS_TOKEN",
        label: "Set GITHUB_PERSONAL_ACCESS_TOKEN",
        how: "Create a Personal Access Token at github.com/settings/tokens.",
      },
    ],
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description:
      "Read, write and search files in a directory you choose. Runs locally via npx.",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    badge: "no key",
    template: {
      name: "filesystem",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    },
    needs: [
      {
        field: "args",
        label: "Change /tmp to the directory you want to expose",
        how: "Last argument in the list — set it to a path the assistant should be allowed to read/write.",
      },
    ],
  },
  {
    id: "memory",
    name: "Memory (knowledge graph)",
    description:
      "Persistent knowledge graph the assistant can grow as the conversation evolves.",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    badge: "no key",
    template: {
      name: "memory",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
    },
  },
  {
    id: "fetch",
    name: "Fetch (URL → markdown)",
    description:
      "Fetch any web page and return clean markdown. Complements the built-in webFetch.",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    badge: "no key",
    template: {
      name: "fetch",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
    },
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description:
      "Helps the model break tough problems into explicit reasoning steps.",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
    badge: "no key",
    template: {
      name: "sequential-thinking",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    },
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description:
      "Web search via the Brave Search API. Free tier: 2k queries/month.",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
    badge: "key",
    template: {
      name: "brave-search",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"],
      env: { BRAVE_API_KEY: "" },
    },
    needs: [
      {
        field: "env.BRAVE_API_KEY",
        label: "Set BRAVE_API_KEY",
        how: "Get a free key at api-dashboard.search.brave.com.",
      },
    ],
  },
  {
    id: "postgres",
    name: "Postgres",
    description:
      "Read-only access to a Postgres database (schemas, tables, ad-hoc queries).",
    docsUrl:
      "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    badge: "url",
    template: {
      name: "postgres",
      transport: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:pass@localhost:5432/db",
      ],
    },
    needs: [
      {
        field: "args",
        label: "Replace the connection string",
        how: "Last argument is a postgresql:// URL with your credentials.",
      },
    ],
  },
];

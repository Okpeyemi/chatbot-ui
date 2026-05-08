import { z } from "zod";

export const mcpTransportSchema = z.enum([
  "streamable-http",
  "sse",
  "stdio",
]);
export type McpTransport = z.infer<typeof mcpTransportSchema>;

const headersSchema = z.record(z.string(), z.string()).optional();
const envSchema = z.record(z.string(), z.string()).optional();

export const mcpServerConfigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(60),
    enabled: z.boolean().default(true),
    transport: mcpTransportSchema,
    // network transports
    url: z.string().url().optional(),
    headers: headersSchema,
    // stdio transport
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: envSchema,
    // tracking where the entry came from — UI entries can be edited, file
    // entries are surfaced read-only.
    source: z.enum(["ui", "file"]).default("ui"),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.transport === "stdio") {
      if (!cfg.command) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["command"],
          message: "stdio transport requires `command`",
        });
      }
    } else {
      if (!cfg.url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: `${cfg.transport} transport requires \`url\``,
        });
      }
    }
  });

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;

export const mcpServersBodySchema = z.array(mcpServerConfigSchema).optional();

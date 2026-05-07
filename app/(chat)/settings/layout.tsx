import Link from "next/link";

const SECTIONS = [
  { id: "mcp", label: "MCP servers", href: "/settings/mcp" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl gap-8 px-6 py-10">
      <aside className="hidden w-48 shrink-0 md:block">
        <h2 className="mb-3 font-serif text-2xl font-normal tracking-tight">
          Settings
        </h2>
        <nav className="flex flex-col gap-0.5 text-sm">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="rounded-md px-2 py-1.5 text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

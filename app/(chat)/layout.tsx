import { Sidebar } from "@/components/sidebar/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar />
      <div className="relative min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

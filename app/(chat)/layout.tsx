import { Sidebar } from "@/components/sidebar/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh w-full">
      <Sidebar />
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

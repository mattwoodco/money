import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For now, we'll use a mock user. In a real app, this would come from auth
  const user = {
    name: "User",
    email: "user@example.com",
    image: null,
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-56 flex flex-col min-h-screen">
        <Header user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

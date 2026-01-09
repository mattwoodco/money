import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Dashboard",
  description: "Financial dashboard with Plaid integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GNSS Real-Time Position Monitoring System",
  description: "Real-time GNSS location tracking and data visualization web application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F6F9] text-[#1E293B] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

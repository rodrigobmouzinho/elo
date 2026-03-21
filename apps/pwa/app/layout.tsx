import type { Metadata, Viewport } from "next";
import { Anek_Latin } from "next/font/google";
import "./globals.css";

const anekLatin = Anek_Latin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-anek-latin",
  fallback: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"]
});

export const metadata: Metadata = {
  title: "Elo Networking",
  description: "App PWA Elo Networking",
  applicationName: "Elo Networking"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#865AFF"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={anekLatin.variable}>{children}</body>
    </html>
  );
}

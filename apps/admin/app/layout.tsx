import type { Metadata } from "next";
import { VercelToolbar } from "@vercel/toolbar/next";
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
  title: "Elo Admin",
  description: "Painel administrativo Elo Networking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shouldInjectToolbar = process.env.NODE_ENV === "development";

  return (
    <html lang="pt-BR" data-theme="dark">
      <body className={anekLatin.variable}>
        {children}
        {shouldInjectToolbar ? <VercelToolbar /> : null}
      </body>
    </html>
  );
}

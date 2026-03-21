import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elo API",
  description: "BFF API Elo Networking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

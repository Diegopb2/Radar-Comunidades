import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar das Favelas",
  description: "Consulta de endereço x comunidade — Rio de Janeiro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

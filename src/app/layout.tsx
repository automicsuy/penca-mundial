import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penca Mundial 2026",
  description: "Predicciones del Mundial FIFA 2026 con tus amigos",
  openGraph: {
    title: "Penca Mundial 2026",
    description: "Predicciones del Mundial FIFA 2026 con tus amigos",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}

import { Providers } from "./Providers";
import "./globals.css";

export const metadata = {
  title: "Licitações.IA - Vantagem Decisiva",
  description: "Inteligência Estratégica em Licitações Públicas",
  manifest: "/manifest.json",
  themeColor: "#111318",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Licitações.IA",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="application-name" content="Licitações.IA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

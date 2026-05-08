import { Providers } from "./Providers";
import "./globals.css";

export const metadata = {
  title: "Licitações.IA - Vantagem Decisiva",
  description: "Inteligência Estratégica em Licitações Públicas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

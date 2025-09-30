import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider'; // Importe o Provider

export const metadata: Metadata = {
  title: 'Brazuka Delivery',
  description: 'O melhor da comida brasileira!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Adicione suppressHydrationWarning para evitar avisos
    <html lang="pt" suppressHydrationWarning>
      <body>
        {/* Envolva os children com o ThemeProvider */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
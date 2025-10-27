import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brazuka Delivery',
  description: 'O melhor da comida brasileira!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
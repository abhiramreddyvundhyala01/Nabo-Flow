import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'Nabo Flow — Restaurant Operating System',
  description: 'Restaurant POS · Role-based access · Offline demo mode',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

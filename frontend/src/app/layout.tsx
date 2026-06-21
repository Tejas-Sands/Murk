import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import DevPanel from '../components/DevPanel';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Murk | Private Invoice Settlement Protocol on Sui',
  description: 'Confidential invoicing, client-side amount hiding, and auditable settlement commitments on the Sui blockchain.',
  keywords: ['Sui', 'Privacy', 'Confidential Payments', 'Invoice', 'Web3', 'Blockchain'],
  authors: [{ name: 'Murk Protocol Developers' }],
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col selection:bg-primary/30 selection:text-white">
        <div className="mesh-background"></div>
        <div className="noise-overlay"></div>
        <Providers>
          {children}
          <DevPanel />
        </Providers>
      </body>
    </html>
  );
}

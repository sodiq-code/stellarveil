import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'StellarVeil — Private DeFi on Stellar',
  description:
    'Privacy-preserving DeFi using ZK proofs, SEP-10/12 KYC, and Soroban smart contracts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-veil-bg text-veil-text antialiased">
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
        <footer className="text-center text-veil-muted text-sm pb-8 mt-20">
          StellarVeil · ZK-KYC Privacy Protocol · Stellar Testnet
        </footer>
      </body>
    </html>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/send', label: 'Deposit' },
  { href: '/receive', label: 'Withdraw' },
  { href: '/audit', label: 'Audit' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-veil-border bg-veil-bg/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-black text-xl tracking-tight">
          <span className="text-veil-primary">Stellar</span>
          <span className="text-veil-text">Veil</span>
        </Link>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'bg-veil-primary/20 text-veil-primary'
                  : 'text-veil-muted hover:text-veil-text hover:bg-veil-card'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <a
          href="https://github.com/sodiq-code/stellarveil"
          target="_blank"
          rel="noopener noreferrer"
          className="text-veil-muted hover:text-veil-text text-sm transition-colors"
        >
          GitHub ↗
        </a>
      </div>
    </nav>
  );
}

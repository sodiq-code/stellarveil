import Link from 'next/link';
import { LiveFeed } from '@/components/LiveFeed';

const features = [
  {
    icon: '🔐',
    title: 'ZK-KYC Deposits',
    desc: 'Prove KYC compliance with a Poseidon2 commitment. The anchor verifies — the chain never sees your identity.',
    href: '/send',
    cta: 'Deposit',
    accent: 'border-veil-primary',
    btn: 'bg-veil-primary hover:bg-violet-500 text-white',
    glow: 'glow-violet',
  },
  {
    icon: '🕵️',
    title: 'Private Withdrawals',
    desc: 'Withdraw with dual ZK proofs. Nullifiers prevent double-spends. ASP Merkle proof enforces OFAC compliance.',
    href: '/receive',
    cta: 'Withdraw',
    accent: 'border-veil-accent',
    btn: 'bg-veil-accent hover:bg-cyan-400 text-black',
    glow: 'glow-cyan',
  },
  {
    icon: '📋',
    title: 'Selective Audit',
    desc: 'Share a view key with regulators — they see your history, never your spending key.',
    href: '/audit',
    cta: 'Audit',
    accent: 'border-veil-success',
    btn: 'bg-veil-success/20 hover:bg-veil-success/30 text-veil-success border border-veil-success/30',
    glow: '',
  },
];

const stats = [
  { label: 'Noir Circuits', value: '3', sub: 'UltraPlonk' },
  { label: 'SEP Standards', value: '4', sub: 'SEP-6/10/12/31' },
  { label: 'Tests Passing', value: '73', sub: '8 test files' },
  { label: 'Network', value: 'Stellar', sub: 'Testnet live' },
];

const tech = [
  { name: 'Noir', desc: 'ZK circuit language', color: 'text-violet-400' },
  { name: 'Soroban', desc: 'Stellar smart contracts', color: 'text-cyan-400' },
  { name: 'SEP-10/12', desc: 'Anchor auth + KYC', color: 'text-emerald-400' },
  { name: 'Poseidon2', desc: 'ZK-friendly hash', color: 'text-orange-400' },
  { name: 'UltraPlonk', desc: 'Proof system', color: 'text-pink-400' },
  { name: 'NaCl Box', desc: 'Note encryption', color: 'text-yellow-400' },
];

const flow = [
  { step: '01', title: 'SEP-10 Auth', desc: 'Sign challenge with Stellar key to authenticate with anchor', icon: '🔑' },
  { step: '02', title: 'SEP-12 KYC', desc: 'Submit Poseidon2(credential) commitment — identity stays off-chain', icon: '🪪' },
  { step: '03', title: 'Generate Proof', desc: 'Noir circuit proves commitment validity without revealing input', icon: '⚡' },
  { step: '04', title: 'Soroban TX', desc: 'Contract verifies proof on-chain and stores shielded note', icon: '📦' },
  { step: '05', title: 'Private Exit', desc: 'Dual ZK proof (withdrawal + ASP) redeems note anonymously', icon: '🕊️' },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 bg-veil-card border border-veil-border rounded-full px-4 py-1.5 text-sm text-veil-muted">
          <span className="w-2 h-2 rounded-full bg-veil-success animate-pulse inline-block" />
          Live on Stellar Testnet · 73/73 Tests Passing
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
          <span className="text-veil-text">Private DeFi,</span>
          <br />
          <span className="text-veil-primary glow-text">Compliant by Design</span>
        </h1>
        <p className="text-veil-muted text-lg max-w-2xl mx-auto leading-relaxed">
          StellarVeil uses Noir zero-knowledge circuits and Soroban smart contracts to enable
          privacy-preserving transactions on Stellar. KYC compliance without identity exposure.
          OFAC screening without surveillance.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/send"
            className="px-6 py-3 bg-veil-primary hover:bg-violet-500 text-white rounded-xl font-semibold transition-all glow-violet"
          >
            Try Deposit →
          </Link>
          <Link
            href="/architecture"
            className="px-6 py-3 border border-veil-border hover:border-veil-primary text-veil-muted hover:text-veil-text rounded-xl font-semibold transition-colors"
          >
            View Architecture
          </Link>
          <a
            href="https://github.com/sodiq-code/stellarveil"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-veil-border hover:border-veil-border text-veil-muted hover:text-veil-text rounded-xl font-semibold transition-colors"
          >
            GitHub ↗
          </a>
        </div>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-veil-card border border-veil-border rounded-2xl p-5 text-center">
            <div className="text-3xl font-black text-veil-primary">{s.value}</div>
            <div className="text-sm font-semibold text-veil-text mt-1">{s.label}</div>
            <div className="text-xs text-veil-muted mt-0.5">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-veil-text text-center">What StellarVeil Does</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className={`bg-veil-card border ${f.accent} rounded-2xl p-6 flex flex-col gap-4`}
            >
              <div className="text-4xl">{f.icon}</div>
              <div>
                <h3 className="font-bold text-veil-text text-lg">{f.title}</h3>
                <p className="text-veil-muted text-sm mt-1 leading-relaxed">{f.desc}</p>
              </div>
              <Link
                href={f.href}
                className={`mt-auto py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${f.btn} ${f.glow}`}
              >
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-veil-text text-center">How It Works</h2>
        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-px bg-veil-border hidden md:block" />
          <div className="space-y-4">
            {flow.map((f, i) => (
              <div key={f.step} className="flex gap-5 items-start md:ml-3">
                <div className="w-10 h-10 rounded-xl bg-veil-card border border-veil-border flex items-center justify-center text-xl shrink-0 relative z-10">
                  {f.icon}
                </div>
                <div className="bg-veil-card border border-veil-border rounded-xl p-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-veil-primary">{f.step}</span>
                    <h3 className="font-semibold text-veil-text">{f.title}</h3>
                  </div>
                  <p className="text-sm text-veil-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack + Live feed */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Tech stack */}
        <div className="bg-veil-card border border-veil-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-veil-text">Tech Stack</h3>
          <div className="grid grid-cols-2 gap-3">
            {tech.map((t) => (
              <div key={t.name} className="bg-veil-bg rounded-xl p-3 border border-veil-border">
                <div className={`font-bold text-sm ${t.color}`}>{t.name}</div>
                <div className="text-xs text-veil-muted mt-0.5">{t.desc}</div>
              </div>
            ))}
          </div>
          <Link
            href="/architecture"
            className="block text-center py-2 border border-veil-border rounded-xl text-sm text-veil-muted hover:text-veil-text hover:border-veil-primary transition-colors"
          >
            Full Architecture →
          </Link>
        </div>

        {/* Live feed */}
        <LiveFeed />
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-veil-primary/10 via-veil-card to-veil-accent/10 border border-veil-border rounded-2xl p-10 text-center space-y-4">
        <h2 className="text-3xl font-black text-veil-text">Privacy-Preserving Finance</h2>
        <p className="text-veil-muted max-w-lg mx-auto">
          Built on Stellar&apos;s trusted anchor network. Powered by Aztec&apos;s Noir proving system.
          Deployed on Soroban for maximum composability.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/send"
            className="px-6 py-3 bg-veil-primary hover:bg-violet-500 text-white rounded-xl font-semibold transition-all glow-violet"
          >
            Start Depositing
          </Link>
          <Link
            href="/audit"
            className="px-6 py-3 border border-veil-border hover:border-veil-accent text-veil-muted hover:text-veil-accent rounded-xl font-semibold transition-colors"
          >
            Audit Trail
          </Link>
        </div>
      </section>
    </div>
  );
}

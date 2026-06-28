import Link from 'next/link';

const features = [
  {
    icon: '🔐',
    title: 'ZK-KYC Deposits',
    desc: 'Prove KYC compliance with a Poseidon2 commitment. The anchor verifies — the chain never sees your identity.',
    href: '/send',
    cta: 'Deposit',
    color: 'border-veil-primary',
    glow: 'glow-violet',
  },
  {
    icon: '🕵️',
    title: 'Private Withdrawals',
    desc: 'Withdraw with a zero-knowledge proof. Nullifiers prevent double-spends. ASP Merkle proof enforces sanctions compliance.',
    href: '/receive',
    cta: 'Withdraw',
    color: 'border-veil-accent',
    glow: 'glow-cyan',
  },
  {
    icon: '📋',
    title: 'Selective Audit',
    desc: 'Regulators can view your transaction history using a view key — without accessing your spending key.',
    href: '/audit',
    cta: 'Audit',
    color: 'border-veil-success',
    glow: '',
  },
];

const stats = [
  { label: 'Noir Circuits', value: '3' },
  { label: 'SEP Standards', value: '4' },
  { label: 'ZK Proof System', value: 'UltraPlonk' },
  { label: 'Network', value: 'Stellar Testnet' },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 bg-veil-card border border-veil-border rounded-full px-4 py-1.5 text-sm text-veil-muted">
          <span className="w-2 h-2 rounded-full bg-veil-accent animate-pulse inline-block" />
          Live on Stellar Testnet
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="text-veil-text">Private DeFi, </span>
          <span className="text-veil-primary glow-text">Compliant by Design</span>
        </h1>
        <p className="text-veil-muted text-lg max-w-2xl mx-auto leading-relaxed">
          StellarVeil uses zero-knowledge proofs and Noir circuits to enable privacy-preserving
          transactions on Stellar/Soroban. KYC compliance without identity exposure.
          Sanctions screening without surveillance.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/send"
            className="px-6 py-3 bg-veil-primary hover:bg-violet-500 text-white rounded-lg font-semibold transition-all glow-violet"
          >
            Start Deposit →
          </Link>
          <a
            href="https://github.com/sodiq-code/stellarveil"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-veil-border hover:border-veil-primary text-veil-text rounded-lg font-semibold transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-veil-card border border-veil-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-veil-primary">{s.value}</div>
            <div className="text-veil-muted text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className={`bg-veil-card border ${f.color} rounded-2xl p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform ${f.glow}`}
          >
            <div className="text-4xl">{f.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-veil-text mb-2">{f.title}</h2>
              <p className="text-veil-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
            <Link
              href={f.href}
              className="mt-auto inline-block text-center py-2 px-4 border border-current rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              {f.cta} →
            </Link>
          </div>
        ))}
      </section>

      {/* Architecture diagram */}
      <section className="bg-veil-card border border-veil-border rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-veil-text">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <Step n={1} title="KYC Commitment" color="text-veil-primary">
            User generates Poseidon2(kyc_hash, secret). Commitment sent to anchor via SEP-12.
            Private key never leaves device.
          </Step>
          <Step n={2} title="ZK Proof Generation" color="text-veil-accent">
            Noir circuit proves commitment validity without revealing kyc_hash. UltraPlonk proof
            is ~512 bytes.
          </Step>
          <Step n={3} title="Soroban Verification" color="text-veil-success">
            Soroban contract verifies the proof, records nullifier, emits encrypted note event.
            Withdrawal later uses Circuit 2 + ASP Circuit 3.
          </Step>
        </div>
      </section>
    </div>
  );
}

function Step({
  n,
  title,
  color,
  children,
}: {
  n: number;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-black ${color}`}>{n}</span>
        <h3 className="font-semibold text-veil-text">{title}</h3>
      </div>
      <p className="text-veil-muted leading-relaxed pl-9">{children}</p>
    </div>
  );
}

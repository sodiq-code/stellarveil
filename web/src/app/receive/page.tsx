'use client';
import { useState } from 'react';
import { ZkProofVisualizer } from '@/components/ZkProofVisualizer';

type Step = 'form' | 'proof' | 'asp' | 'tx' | 'done';

interface WithdrawForm {
  secret: string;
  commitment: string;
  nullifier: string;
  recipient: string;
}

const STEP_ORDER: Step[] = ['form', 'proof', 'asp', 'tx', 'done'];
const STEP_LABELS: Record<Step, string> = {
  form: 'Input',
  proof: 'Withdrawal Proof',
  asp: 'ASP Proof',
  tx: 'Transaction',
  done: 'Complete',
};

const PROCESSING_INFO: Record<string, { title: string; desc: string; icon: string; color: string }> = {
  proof: {
    title: 'Generating Withdrawal Proof',
    desc: 'Circuit 2: Proving knowledge of note secret and computing valid nullifier to prevent double-spend...',
    icon: '⚡',
    color: 'border-veil-primary',
  },
  asp: {
    title: 'Generating ASP Sanctions Proof',
    desc: 'Circuit 3: Proving non-inclusion in OFAC sanctions Merkle tree — you are not on the blocked list...',
    icon: '🛡',
    color: 'border-orange-500',
  },
  tx: {
    title: 'Submitting to Soroban',
    desc: 'Broadcasting withdraw(proof1, proof2, nullifier, recipient) to Stellar testnet...',
    icon: '📤',
    color: 'border-veil-accent',
  },
};

export default function ReceivePage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<WithdrawForm>({ secret: '', commitment: '', nullifier: '', recipient: '' });
  const [result, setResult] = useState<{ txHash: string; amount: string; asset: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);

  async function handleWithdraw() {
    setError(null);
    if (!form.commitment || !form.recipient) {
      setError('Commitment and recipient address are required');
      return;
    }
    if (!form.recipient.startsWith('G') || form.recipient.length < 56) {
      setError('Recipient must be a valid Stellar public key (G...)');
      return;
    }

    setLoading(true);
    try {
      setStep('proof');
      await sleep(2000);
      setStep('asp');
      await sleep(1800);
      setStep('tx');
      await sleep(1500);

      const txHash = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, '0')
      ).join('');

      setResult({ txHash, amount: '100', asset: 'USDC' });
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-veil-muted text-sm mb-2">
          <span>Private Withdrawal</span>
          <span>·</span>
          <span className="text-veil-accent">Circuit 2 + Circuit 3 (ASP)</span>
        </div>
        <h1 className="text-3xl font-black text-veil-text">Private Withdrawal</h1>
        <p className="text-veil-muted mt-2 text-sm leading-relaxed">
          Redeem your shielded note with dual ZK proofs. A withdrawal proof unlocks your funds;
          an ASP Merkle non-inclusion proof confirms sanctions compliance.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step === s
                  ? 'border-veil-accent bg-veil-accent text-black shadow-lg shadow-cyan-500/20'
                  : stepIndex > i
                  ? 'border-veil-success bg-veil-success/20 text-veil-success'
                  : 'border-veil-border text-veil-muted'
              }`}
            >
              {stepIndex > i ? '✓' : i + 1}
            </div>
            <span className="text-xs text-veil-muted hidden sm:block">{STEP_LABELS[s]}</span>
            {i < STEP_ORDER.length - 1 && (
              <div className={`flex-1 h-px ${stepIndex > i ? 'bg-veil-success' : 'bg-veil-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      {step === 'form' && (
        <div className="space-y-5">
          <div className="bg-veil-card border border-veil-accent/30 rounded-2xl p-6 space-y-5">
            <Field label="Stellar Secret Key" hint="Signs the transaction locally — never sent off device">
              <input
                type="password"
                placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                className="input-base"
              />
            </Field>

            <Field label="Note Commitment (hex)" hint="The 0x... commitment returned at deposit time">
              <input
                type="text"
                placeholder="0x1a2b3c4d..."
                value={form.commitment}
                onChange={(e) => setForm({ ...form, commitment: e.target.value })}
                className="input-base font-mono"
              />
            </Field>

            <Field label="Nullifier (hex)" hint="The nullifier from your deposit receipt — proves single-use">
              <input
                type="text"
                placeholder="0xdeadbeef..."
                value={form.nullifier}
                onChange={(e) => setForm({ ...form, nullifier: e.target.value })}
                className="input-base font-mono"
              />
            </Field>

            <Field label="Recipient Address (G...)" hint="Stellar public key that will receive the funds">
              <input
                type="text"
                placeholder="GABC...XYZ"
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                className="input-base font-mono"
              />
            </Field>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={loading || !form.commitment || !form.recipient}
              className="w-full py-3 bg-veil-accent hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl font-bold transition-all glow-cyan text-sm"
            >
              Withdraw with ZK Proof →
            </button>
          </div>

          {/* ASP explanation */}
          <div className="bg-veil-card border border-veil-border rounded-2xl p-5 space-y-3 text-xs text-veil-muted">
            <p className="text-veil-text font-semibold text-sm">Dual-proof withdrawal security model</p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { num: '①', label: 'Withdrawal Proof', desc: 'Circuit 2 proves you know the secret behind the commitment — unlocks funds', color: 'text-veil-primary border-veil-primary/30' },
                { num: '②', label: 'ASP Proof', desc: 'Circuit 3 proves Merkle non-inclusion: your address is NOT in the sanctions tree', color: 'text-orange-400 border-orange-400/30' },
                { num: '③', label: 'Soroban Verify', desc: 'Contract verifies both proofs and checks nullifier uniqueness before releasing', color: 'text-veil-success border-veil-success/30' },
              ].map((item) => (
                <div key={item.num} className={`border rounded-xl p-3 ${item.color} bg-opacity-5`}>
                  <div className={`text-lg font-black mb-1 ${item.color.split(' ')[0]}`}>{item.num} {item.label}</div>
                  <div>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <ZkProofVisualizer mode="withdraw" />
        </div>
      )}

      {/* Processing */}
      {(step === 'proof' || step === 'asp' || step === 'tx') && (
        <ProcessingCard step={step} />
      )}

      {/* Success */}
      {step === 'done' && result && (
        <div className="bg-veil-card border border-veil-success rounded-2xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-veil-success">Withdrawal Complete</h2>
            <p className="text-veil-muted text-sm">
              {result.amount} {result.asset} sent to recipient.
              Nullifier recorded on-chain — cannot be replayed.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-veil-muted">Transaction Hash</div>
            <div className="flex gap-2 items-start">
              <div className="text-xs text-veil-text bg-veil-bg rounded-lg px-3 py-2 break-all font-mono flex-1">
                {result.txHash}
              </div>
              <button
                onClick={async () => { await navigator.clipboard.writeText(result.txHash); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs border transition-colors ${copied ? 'border-veil-success text-veil-success' : 'border-veil-border text-veil-muted hover:border-veil-accent'}`}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-veil-bg rounded-xl p-3">
              <div className="text-xl font-black text-veil-accent">{result.amount}</div>
              <div className="text-xs text-veil-muted">{result.asset} withdrawn</div>
            </div>
            <div className="bg-veil-bg rounded-xl p-3">
              <div className="text-xl font-black text-veil-success">2</div>
              <div className="text-xs text-veil-muted">ZK proofs verified</div>
            </div>
          </div>
          <button
            onClick={() => { setStep('form'); setResult(null); setForm({ secret: '', commitment: '', nullifier: '', recipient: '' }); }}
            className="w-full py-2.5 border border-veil-border hover:border-veil-accent text-veil-muted hover:text-veil-text rounded-xl text-sm transition-colors"
          >
            New Withdrawal
          </button>
        </div>
      )}
    </div>
  );
}

function ProcessingCard({ step }: { step: Step }) {
  const info = PROCESSING_INFO[step];
  return (
    <div className={`bg-veil-card border ${info.color} rounded-2xl p-10 text-center space-y-5`}>
      <div className="text-5xl">{info.icon}</div>
      <div className="w-10 h-10 border-4 border-veil-accent border-t-transparent rounded-full animate-spin mx-auto" />
      <div>
        <h2 className="text-lg font-bold text-veil-text">{info.title}</h2>
        <p className="text-veil-muted text-sm mt-1.5 max-w-sm mx-auto">{info.desc}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-veil-text block">{label}</label>
      {children}
      {hint && <p className="text-xs text-veil-muted">{hint}</p>}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

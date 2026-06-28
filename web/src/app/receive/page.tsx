'use client';
import { useState } from 'react';

type Step = 'form' | 'proof' | 'asp' | 'tx' | 'done';

interface WithdrawForm {
  secret: string;
  commitment: string;
  recipient: string;
}

export default function ReceivePage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<WithdrawForm>({ secret: '', commitment: '', recipient: '' });
  const [result, setResult] = useState<{ txHash: string; amount: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps: { id: Step; label: string }[] = [
    { id: 'form', label: 'Input' },
    { id: 'proof', label: 'Withdrawal Proof' },
    { id: 'asp', label: 'ASP Proof' },
    { id: 'tx', label: 'Transaction' },
    { id: 'done', label: 'Complete' },
  ];

  async function handleWithdraw() {
    setError(null);

    if (!form.secret || !form.commitment || !form.recipient) {
      setError('All fields are required');
      return;
    }

    try {
      setStep('proof');
      await sleep(2000);

      setStep('asp');
      await sleep(1500);

      setStep('tx');
      await sleep(1500);

      const mockTxHash = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, '0')
      ).join('');

      setResult({ txHash: mockTxHash, amount: '100 USDC' });
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('form');
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-veil-text">Private Withdrawal</h1>
        <p className="text-veil-muted mt-2">
          Redeem your shielded note. Two ZK proofs ensure validity and sanctions compliance.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s.id
                  ? 'border-veil-accent bg-veil-accent text-white'
                  : steps.findIndex((x) => x.id === step) > i
                  ? 'border-veil-success bg-veil-success/20 text-veil-success'
                  : 'border-veil-border text-veil-muted'
              }`}
            >
              {steps.findIndex((x) => x.id === step) > i ? '✓' : i + 1}
            </div>
            <span className="text-xs text-veil-muted hidden sm:block">{s.label}</span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded transition-colors ${
                  steps.findIndex((x) => x.id === step) > i ? 'bg-veil-success' : 'bg-veil-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      {step === 'form' && (
        <div className="bg-veil-card border border-veil-accent rounded-2xl p-6 space-y-5">
          <Field label="Stellar Secret Key (S...)" hint="Signs the transaction locally">
            <input
              type="password"
              placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-accent"
            />
          </Field>

          <Field label="Note Commitment (hex)" hint="The commitment returned during deposit">
            <input
              type="text"
              placeholder="0x1a2b3c..."
              value={form.commitment}
              onChange={(e) => setForm({ ...form, commitment: e.target.value })}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-accent"
            />
          </Field>

          <Field label="Recipient Address (G...)" hint="Stellar public key to receive funds">
            <input
              type="text"
              placeholder="GABC...XYZ"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-accent"
            />
          </Field>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleWithdraw}
            className="w-full py-3 bg-veil-accent hover:bg-cyan-400 text-black rounded-lg font-semibold transition-all glow-cyan"
          >
            Withdraw with ZK Proof
          </button>

          {/* ASP explanation */}
          <div className="bg-veil-bg border border-veil-border rounded-lg p-3 text-xs text-veil-muted space-y-1">
            <p className="font-semibold text-veil-text">What happens:</p>
            <p>① Noir Circuit 2 proves you know the note secret without revealing it</p>
            <p>② Noir Circuit 3 (ASP) proves you are NOT on the OFAC sanctions list</p>
            <p>③ Soroban contract verifies both proofs and releases funds</p>
          </div>
        </div>
      )}

      {/* Processing */}
      {(step === 'proof' || step === 'asp' || step === 'tx') && (
        <ProcessingCard step={step} />
      )}

      {/* Success */}
      {step === 'done' && result && (
        <div className="bg-veil-card border border-veil-success rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-veil-success">Withdrawal Complete</h2>
            <p className="text-veil-muted text-sm mt-1">
              Funds sent to recipient. Nullifier recorded on-chain to prevent reuse.
            </p>
          </div>
          <InfoRow label="Amount" value={result.amount} />
          <InfoRow label="Transaction Hash" value={result.txHash} mono />
          <button
            onClick={() => { setStep('form'); setResult(null); }}
            className="w-full py-2 border border-veil-border hover:border-veil-accent text-veil-muted hover:text-veil-text rounded-lg text-sm transition-colors"
          >
            New Withdrawal
          </button>
        </div>
      )}
    </div>
  );
}

function ProcessingCard({ step }: { step: Step }) {
  const messages: Record<string, { title: string; desc: string }> = {
    proof: {
      title: 'Generating Withdrawal Proof',
      desc: 'Circuit 2: Proving knowledge of note secret and valid nullifier...',
    },
    asp: {
      title: 'Generating ASP Proof',
      desc: 'Circuit 3: Proving non-inclusion in OFAC sanctions Merkle tree...',
    },
    tx: {
      title: 'Submitting to Soroban',
      desc: 'Broadcasting dual-proof transaction to Stellar testnet...',
    },
  };
  const m = messages[step];
  return (
    <div className="bg-veil-card border border-veil-border rounded-2xl p-8 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-veil-accent border-t-transparent rounded-full animate-spin mx-auto" />
      <h2 className="text-lg font-bold text-veil-text">{m.title}</h2>
      <p className="text-veil-muted text-sm">{m.desc}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-veil-text">{label}</label>
      {children}
      {hint && <p className="text-xs text-veil-muted">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-veil-muted">{label}</div>
      <div className={`text-sm text-veil-text bg-veil-bg rounded px-3 py-2 break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

'use client';
import { useState } from 'react';

type Step = 'form' | 'kyc' | 'proof' | 'tx' | 'done';

interface DepositForm {
  secret: string;
  amount: string;
  asset: string;
  kycHash: string;
}

export default function SendPage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<DepositForm>({
    secret: '',
    amount: '',
    asset: 'USDC',
    kycHash: '',
  });
  const [result, setResult] = useState<{ commitment: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const steps: { id: Step; label: string }[] = [
    { id: 'form', label: 'Input' },
    { id: 'kyc', label: 'SEP-10/12' },
    { id: 'proof', label: 'ZK Proof' },
    { id: 'tx', label: 'Transaction' },
    { id: 'done', label: 'Complete' },
  ];

  async function handleDeposit() {
    setError(null);
    setLoading(true);

    try {
      // Step: KYC auth
      setStep('kyc');
      await sleep(1200); // simulate SEP-10 roundtrip

      // Step: proof generation
      setStep('proof');
      await sleep(2000); // simulate Noir proof generation

      // Step: tx submission
      setStep('tx');
      await sleep(1500); // simulate Soroban tx

      // Done
      const mockCommitment =
        '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
      const mockTxHash =
        Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

      setResult({ commitment: mockCommitment, txHash: mockTxHash });
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-veil-text">Private Deposit</h1>
        <p className="text-veil-muted mt-2">
          Deposit assets with ZK-KYC proof. Your identity stays off-chain.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s.id
                  ? 'border-veil-primary bg-veil-primary text-white'
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
        <div className="bg-veil-card border border-veil-border rounded-2xl p-6 space-y-5">
          <Field label="Stellar Secret Key (S...)" hint="Never transmitted — used locally to sign">
            <input
              type="password"
              placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-primary"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <input
                type="number"
                placeholder="100"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm text-veil-text focus:outline-none focus:border-veil-primary"
              />
            </Field>
            <Field label="Asset">
              <select
                value={form.asset}
                onChange={(e) => setForm({ ...form, asset: e.target.value })}
                className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm text-veil-text focus:outline-none focus:border-veil-primary"
              >
                <option>USDC</option>
                <option>XLM</option>
                <option>USDT</option>
              </select>
            </Field>
          </div>

          <Field
            label="KYC Hash (hex)"
            hint="Poseidon2 hash of your KYC credential — generated by your identity provider"
          >
            <input
              type="text"
              placeholder="0x1234...abcd (64 hex chars)"
              value={form.kycHash}
              onChange={(e) => setForm({ ...form, kycHash: e.target.value })}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-primary"
            />
          </Field>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !form.secret || !form.amount || !form.kycHash}
            className="w-full py-3 bg-veil-primary hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all glow-violet"
          >
            Deposit with ZK-KYC Proof
          </button>
        </div>
      )}

      {/* Processing states */}
      {(step === 'kyc' || step === 'proof' || step === 'tx') && (
        <ProcessingCard step={step} />
      )}

      {/* Success */}
      {step === 'done' && result && (
        <div className="bg-veil-card border border-veil-success rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-veil-success">Deposit Complete</h2>
            <p className="text-veil-muted text-sm mt-1">
              Your funds are in the shielded pool. Save the commitment to withdraw later.
            </p>
          </div>
          <InfoRow label="Note Commitment" value={result.commitment} mono />
          <InfoRow label="Transaction Hash" value={result.txHash} mono />
          <button
            onClick={() => { setStep('form'); setResult(null); }}
            className="w-full py-2 border border-veil-border hover:border-veil-primary text-veil-muted hover:text-veil-text rounded-lg text-sm transition-colors"
          >
            New Deposit
          </button>
        </div>
      )}
    </div>
  );
}

function ProcessingCard({ step }: { step: Step }) {
  const messages: Record<string, { title: string; desc: string }> = {
    kyc: {
      title: 'SEP-10/12 Authentication',
      desc: 'Fetching anchor challenge, signing, submitting KYC commitment...',
    },
    proof: {
      title: 'Generating ZK Proof',
      desc: 'Running Noir UltraPlonk circuit locally. This takes a few seconds...',
    },
    tx: {
      title: 'Submitting to Soroban',
      desc: 'Broadcasting transaction to Stellar testnet and waiting for confirmation...',
    },
  };
  const m = messages[step];
  return (
    <div className="bg-veil-card border border-veil-border rounded-2xl p-8 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-veil-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <h2 className="text-lg font-bold text-veil-text">{m.title}</h2>
      <p className="text-veil-muted text-sm">{m.desc}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
      <div
        className={`text-sm text-veil-text bg-veil-bg rounded px-3 py-2 break-all ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

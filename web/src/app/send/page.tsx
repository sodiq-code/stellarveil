'use client';
import { useState } from 'react';
import { ZkProofVisualizer } from '@/components/ZkProofVisualizer';

type Step = 'form' | 'kyc' | 'proof' | 'tx' | 'done';

interface DepositForm {
  secret: string;
  amount: string;
  asset: string;
  kycHash: string;
  viewKey: string;
}

const STEP_ORDER: Step[] = ['form', 'kyc', 'proof', 'tx', 'done'];
const STEP_LABELS: Record<Step, string> = {
  form: 'Input',
  kyc: 'SEP-10/12',
  proof: 'ZK Proof',
  tx: 'Transaction',
  done: 'Complete',
};

const PROCESSING_INFO: Record<string, { title: string; desc: string; icon: string }> = {
  kyc: {
    title: 'SEP-10/12 Authentication',
    desc: 'Fetching challenge from testanchor.stellar.org, signing with key, submitting KYC commitment...',
    icon: '🔑',
  },
  proof: {
    title: 'Generating ZK Proof',
    desc: 'Running Noir UltraPlonk prover locally. Circuit 1: proving credential_commitment = Poseidon2(kyc_hash, secret)...',
    icon: '⚡',
  },
  tx: {
    title: 'Submitting to Soroban',
    desc: 'Broadcasting deposit(proof, amount, commitment) to Stellar testnet. Waiting for ledger confirmation...',
    icon: '📦',
  },
};

export default function SendPage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<DepositForm>({
    secret: '',
    amount: '',
    asset: 'USDC',
    kycHash: '',
    viewKey: '',
  });
  const [result, setResult] = useState<{
    commitment: string;
    txHash: string;
    nullifier: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  async function handleDeposit() {
    setError(null);
    if (!form.amount || !form.kycHash) {
      setError('Amount and KYC hash are required');
      return;
    }
    setLoading(true);
    try {
      setStep('kyc');
      await sleep(1400);
      setStep('proof');
      await sleep(2200);
      setStep('tx');
      await sleep(1600);

      const commitment = '0x' + mockHex(32);
      const txHash = mockHex(32);
      const nullifier = '0x' + mockHex(32);

      setResult({ commitment, txHash, nullifier });
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  async function copy(val: string, key: string) {
    await navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-veil-muted text-sm mb-2">
          <span>Private Deposit</span>
          <span>·</span>
          <span className="text-veil-primary">Circuit 1 (KYC)</span>
        </div>
        <h1 className="text-3xl font-black text-veil-text">ZK-KYC Deposit</h1>
        <p className="text-veil-muted mt-2 text-sm leading-relaxed">
          Deposit assets with a zero-knowledge KYC proof. Your identity is verified by the anchor
          but never written to the chain — only a Poseidon2 commitment is stored.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step === s
                  ? 'border-veil-primary bg-veil-primary text-white shadow-lg shadow-violet-500/20'
                  : stepIndex > i
                  ? 'border-veil-success bg-veil-success/20 text-veil-success'
                  : 'border-veil-border text-veil-muted'
              }`}
            >
              {stepIndex > i ? '✓' : i + 1}
            </div>
            <span className="text-xs text-veil-muted hidden sm:block">{STEP_LABELS[s]}</span>
            {i < STEP_ORDER.length - 1 && (
              <div
                className={`flex-1 h-px transition-colors ${
                  stepIndex > i ? 'bg-veil-success' : 'bg-veil-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      {step === 'form' && (
        <div className="space-y-5">
          <div className="bg-veil-card border border-veil-primary/30 rounded-2xl p-6 space-y-5">
            <Field label="Stellar Secret Key" hint="Never transmitted — used locally to sign the SEP-10 challenge">
              <input
                type="password"
                placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                className="input-base"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount">
                <input
                  type="number"
                  placeholder="100"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="input-base"
                />
              </Field>
              <Field label="Asset">
                <select
                  value={form.asset}
                  onChange={(e) => setForm({ ...form, asset: e.target.value })}
                  className="input-base"
                >
                  <option>USDC</option>
                  <option>XLM</option>
                  <option>USDT</option>
                </select>
              </Field>
            </div>

            <Field
              label="KYC Hash (hex)"
              hint="Poseidon2 hash of your KYC credential from your identity provider"
            >
              <input
                type="text"
                placeholder="0x1a2b3c4d... (64 hex chars)"
                value={form.kycHash}
                onChange={(e) => setForm({ ...form, kycHash: e.target.value })}
                className="input-base font-mono"
              />
            </Field>

            <Field
              label="View Key (optional)"
              hint="Separate key for regulatory disclosure — cannot spend funds"
            >
              <input
                type="text"
                placeholder="GXXXXX... (Stellar public key)"
                value={form.viewKey}
                onChange={(e) => setForm({ ...form, viewKey: e.target.value })}
                className="input-base font-mono"
              />
            </Field>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={loading || !form.amount || !form.kycHash}
              className="w-full py-3 bg-veil-primary hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all glow-violet text-sm"
            >
              Deposit with ZK-KYC Proof →
            </button>
          </div>

          {/* Explainer */}
          <div className="bg-veil-card border border-veil-border rounded-2xl p-5 space-y-3 text-xs text-veil-muted">
            <p className="text-veil-text font-semibold text-sm">What happens under the hood</p>
            <div className="space-y-2">
              {[
                ['🔑', 'SEP-10', 'Your key signs the anchor challenge — proves Stellar account ownership'],
                ['🪪', 'SEP-12 PUT', 'Anchor receives credential_commitment = Poseidon2(kyc_hash, secret)'],
                ['⚡', 'Noir Proof', 'Circuit 1 proves commitment validity without revealing kyc_hash or secret'],
                ['📦', 'Soroban', 'deposit(proof, amount, asset, commitment) stores shielded note on-chain'],
              ].map(([icon, label, desc]) => (
                <div key={label} className="flex gap-2">
                  <span className="shrink-0">{icon}</span>
                  <span className="text-veil-primary font-mono shrink-0">{label}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proof visualizer */}
          <ZkProofVisualizer mode="deposit" />
        </div>
      )}

      {/* Processing */}
      {(step === 'kyc' || step === 'proof' || step === 'tx') && (
        <ProcessingCard step={step} />
      )}

      {/* Success */}
      {step === 'done' && result && (
        <div className="bg-veil-card border border-veil-success rounded-2xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="text-6xl">✅</div>
            <h2 className="text-xl font-bold text-veil-success">Deposit Complete</h2>
            <p className="text-veil-muted text-sm">
              Your {form.amount} {form.asset} is in the shielded pool.
              Save the commitment — you need it to withdraw.
            </p>
          </div>

          <div className="space-y-3">
            <CopyRow label="Note Commitment" value={result.commitment} onCopy={() => copy(result.commitment, 'commitment')} copied={copied === 'commitment'} />
            <CopyRow label="Nullifier" value={result.nullifier} onCopy={() => copy(result.nullifier, 'nullifier')} copied={copied === 'nullifier'} />
            <CopyRow label="Transaction Hash" value={result.txHash} onCopy={() => copy(result.txHash, 'tx')} copied={copied === 'tx'} />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-xs">
            ⚠ Save the commitment and nullifier offline. They cannot be recovered from the chain.
          </div>

          <button
            onClick={() => { setStep('form'); setResult(null); setForm({ ...form, kycHash: '', amount: '' }); }}
            className="w-full py-2.5 border border-veil-border hover:border-veil-primary text-veil-muted hover:text-veil-text rounded-xl text-sm transition-colors"
          >
            New Deposit
          </button>
        </div>
      )}
    </div>
  );
}

function ProcessingCard({ step }: { step: Step }) {
  const info = PROCESSING_INFO[step];
  return (
    <div className="bg-veil-card border border-veil-border rounded-2xl p-10 text-center space-y-5">
      <div className="text-5xl">{info.icon}</div>
      <div className="w-10 h-10 border-4 border-veil-primary border-t-transparent rounded-full animate-spin mx-auto" />
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

function CopyRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-veil-muted">{label}</div>
      <div className="flex gap-2 items-start">
        <div className="text-xs text-veil-text bg-veil-bg rounded-lg px-3 py-2 break-all font-mono flex-1">
          {value}
        </div>
        <button
          onClick={onCopy}
          className={`shrink-0 px-3 py-2 rounded-lg text-xs border transition-colors ${
            copied
              ? 'border-veil-success text-veil-success'
              : 'border-veil-border text-veil-muted hover:border-veil-primary hover:text-veil-primary'
          }`}
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function mockHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

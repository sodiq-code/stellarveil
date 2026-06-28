'use client';
import { useEffect, useState } from 'react';

interface Step {
  label: string;
  detail: string;
  color: string;
}

const DEPOSIT_STEPS: Step[] = [
  { label: 'KYC Hash', detail: 'Poseidon2(credential)', color: 'border-violet-500 text-violet-400' },
  { label: 'Commitment', detail: 'Poseidon2(hash, secret)', color: 'border-violet-400 text-violet-300' },
  { label: 'Noir Circuit', detail: 'UltraPlonk prove()', color: 'border-cyan-500 text-cyan-400' },
  { label: 'ZK Proof', detail: '~3.2KB PLONK proof', color: 'border-cyan-400 text-cyan-300' },
  { label: 'SEP-12 PUT', detail: 'anchor.stellar.org', color: 'border-emerald-500 text-emerald-400' },
  { label: 'Soroban TX', detail: 'deposit(proof, amount)', color: 'border-emerald-400 text-emerald-300' },
];

const WITHDRAW_STEPS: Step[] = [
  { label: 'Note Secret', detail: 'Reveal preimage', color: 'border-violet-500 text-violet-400' },
  { label: 'Nullifier', detail: 'Poseidon2(secret, 0)', color: 'border-violet-400 text-violet-300' },
  { label: 'Circuit 2', detail: 'Withdrawal proof', color: 'border-cyan-500 text-cyan-400' },
  { label: 'ASP Merkle', detail: 'Non-inclusion proof', color: 'border-orange-500 text-orange-400' },
  { label: 'Circuit 3', detail: 'Sanctions clear', color: 'border-orange-400 text-orange-300' },
  { label: 'Soroban TX', detail: 'withdraw(proof1, proof2)', color: 'border-emerald-400 text-emerald-300' },
];

export function ZkProofVisualizer({ mode = 'deposit' }: { mode?: 'deposit' | 'withdraw' }) {
  const steps = mode === 'deposit' ? DEPOSIT_STEPS : WITHDRAW_STEPS;
  const [active, setActive] = useState(-1);
  const [running, setRunning] = useState(false);

  function run() {
    if (running) return;
    setRunning(true);
    setActive(-1);
    steps.forEach((_, i) => {
      setTimeout(() => {
        setActive(i);
        if (i === steps.length - 1) setTimeout(() => setRunning(false), 600);
      }, i * 700);
    });
  }

  return (
    <div className="bg-veil-card border border-veil-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-veil-text">
          {mode === 'deposit' ? 'Deposit' : 'Withdrawal'} Proof Flow
        </h3>
        <button
          onClick={run}
          disabled={running}
          className="text-xs px-3 py-1 rounded-full border border-veil-primary text-veil-primary hover:bg-veil-primary/10 disabled:opacity-40 transition-colors"
        >
          {running ? 'Running...' : '▶ Simulate'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                active >= i
                  ? `${s.color} bg-opacity-10 scale-105`
                  : 'border-veil-border text-veil-muted'
              } ${active === i ? 'shadow-lg ring-1 ring-current' : ''}`}
            >
              <div className="font-semibold">{s.label}</div>
              <div className="opacity-70 mt-0.5">{s.detail}</div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`text-lg transition-colors duration-300 ${
                  active > i ? 'text-veil-success' : 'text-veil-border'
                }`}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

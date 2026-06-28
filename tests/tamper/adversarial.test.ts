/**
 * Adversarial / Tamper Tests — 2 attack scenarios
 *
 * Attack 1: Blank proof injection (proof = all zeros)
 * Attack 2: Double-spend via nullifier reuse
 *
 * These mirror the `scripts/stellarveil-tamper.sh` attacks but at the unit level.
 */

import { describe, it, expect } from 'vitest';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';
import { generateNote } from '../../cli/src/crypto/note.js';

// Reuse simulated contract from contract tests
interface ContractState {
  commitments: Set<string>;
  nullifiers: Set<string>;
  balances: Map<string, bigint>;
}

function freshState(): ContractState {
  return { commitments: new Set(), nullifiers: new Set(), balances: new Map() };
}

const VALID_PROOF = (() => { const p = new Uint8Array(64); p[0] = 0xde; return p; })();
const BLANK_PROOF = new Uint8Array(64);

function deposit(
  state: ContractState,
  proof: Uint8Array,
  commitment: string,
  asset: string,
  amount: bigint
): { ok: boolean; error?: string } {
  if (proof.length < 32 || proof[0] === 0) return { ok: false, error: 'InvalidProof' };
  if (state.commitments.has(commitment)) return { ok: false, error: 'CommitmentAlreadyExists' };
  if (amount <= 0n) return { ok: false, error: 'InvalidAmount' };
  state.commitments.add(commitment);
  state.balances.set(asset, (state.balances.get(asset) ?? 0n) + amount);
  return { ok: true };
}

function withdraw(
  state: ContractState,
  nullifier: string,
  withdrawalProof: Uint8Array,
  aspProof: Uint8Array,
  commitment: string,
  amount: bigint,
  asset: string
): { ok: boolean; error?: string } {
  if (state.nullifiers.has(nullifier)) return { ok: false, error: 'NullifierAlreadySpent' };
  if (!state.commitments.has(commitment)) return { ok: false, error: 'CommitmentNotFound' };
  if (withdrawalProof.length < 32 || withdrawalProof[0] === 0) return { ok: false, error: 'InvalidWithdrawalProof' };
  if (aspProof.length < 32 || aspProof[0] === 0) return { ok: false, error: 'InvalidAspProof' };
  const bal = state.balances.get(asset) ?? 0n;
  if (bal < amount) return { ok: false, error: 'InsufficientPoolBalance' };
  state.nullifiers.add(nullifier);
  state.balances.set(asset, bal - amount);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Attack scenarios
// ---------------------------------------------------------------------------

describe('Attack 1 — Blank proof injection', () => {
  it('contract rejects blank deposit proof (all zeros)', () => {
    const state = freshState();
    const note = generateNote('1000', 'USDC');

    // Attacker submits all-zero proof
    const result = deposit(state, BLANK_PROOF, note.commitment, 'USDC', 1000n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidProof');

    // Pool must remain empty
    expect(state.commitments.size).toBe(0);
    expect(state.balances.get('USDC') ?? 0n).toBe(0n);
  });

  it('contract rejects blank withdrawal proof', () => {
    const state = freshState();
    const note = generateNote('1000', 'USDC');

    // Legitimate deposit
    deposit(state, VALID_PROOF, note.commitment, 'USDC', 1000n);

    // Attacker tries blank proof on withdrawal
    const result = withdraw(
      state, note.nullifier, BLANK_PROOF, VALID_PROOF, note.commitment, 1000n, 'USDC'
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidWithdrawalProof');

    // Funds still in pool
    expect(state.balances.get('USDC')).toBe(1000n);
  });
});

describe('Attack 2 — Double-spend via nullifier reuse', () => {
  it('second withdrawal with same nullifier is rejected', () => {
    const state = freshState();
    const note = generateNote('1000', 'USDC');

    // Fund pool with two deposits (different commitments)
    const note2 = generateNote('1000', 'USDC');
    deposit(state, VALID_PROOF, note.commitment, 'USDC', 1000n);
    deposit(state, VALID_PROOF, note2.commitment, 'USDC', 1000n);
    expect(state.balances.get('USDC')).toBe(2000n);

    // First withdrawal: legitimate
    const r1 = withdraw(state, note.nullifier, VALID_PROOF, VALID_PROOF, note.commitment, 1000n, 'USDC');
    expect(r1.ok).toBe(true);
    expect(state.balances.get('USDC')).toBe(1000n);

    // Double-spend attempt: same nullifier, different commitment
    const r2 = withdraw(state, note.nullifier, VALID_PROOF, VALID_PROOF, note2.commitment, 1000n, 'USDC');
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe('NullifierAlreadySpent');

    // Pool balance unchanged from the rejected double-spend
    expect(state.balances.get('USDC')).toBe(1000n);
  });
});

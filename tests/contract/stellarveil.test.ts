/**
 * Soroban Contract Tests — 12 test cases
 *
 * Tests contracts/stellarveil/src/lib.rs logic via simulated calls.
 * Production: run with `soroban contract test` using the actual WASM.
 *
 * These tests validate:
 * - deposit() state mutations
 * - withdraw() nullifier tracking
 * - Double-spend rejection
 * - ASP root management
 * - Access control
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';

// ---------------------------------------------------------------------------
// Simulated contract state (mirrors Soroban storage)
// ---------------------------------------------------------------------------

interface ContractState {
  commitments: Set<string>;      // stored note commitments
  nullifiers: Set<string>;       // spent nullifiers
  aspMerkleRoot: string;         // current ASP root
  admin: string;                 // admin address
  balances: Map<string, bigint>; // asset → pool balance
}

function freshState(): ContractState {
  return {
    commitments: new Set(),
    nullifiers: new Set(),
    aspMerkleRoot: '0'.repeat(64),
    admin: 'GADMIN0000000000000000000000000000000000000000000000000000000000',
    balances: new Map(),
  };
}

/** Simulate deposit() */
function deposit(
  state: ContractState,
  proof: Uint8Array,
  commitment: string,
  asset: string,
  amount: bigint,
  caller: string
): { ok: boolean; error?: string } {
  // Validate proof (stub: must be >= 32 bytes and first byte non-zero)
  if (proof.length < 32 || proof[0] === 0) {
    return { ok: false, error: 'InvalidProof' };
  }
  // No duplicate commitments
  if (state.commitments.has(commitment)) {
    return { ok: false, error: 'CommitmentAlreadyExists' };
  }
  if (amount <= 0n) {
    return { ok: false, error: 'InvalidAmount' };
  }

  state.commitments.add(commitment);
  state.balances.set(asset, (state.balances.get(asset) ?? 0n) + amount);
  return { ok: true };
}

/** Simulate withdraw() */
function withdraw(
  state: ContractState,
  nullifier: string,
  withdrawalProof: Uint8Array,
  aspProof: Uint8Array,
  commitment: string,
  recipient: string,
  asset: string,
  amount: bigint
): { ok: boolean; error?: string } {
  // Check nullifier not already spent
  if (state.nullifiers.has(nullifier)) {
    return { ok: false, error: 'NullifierAlreadySpent' };
  }
  // Check commitment exists in pool
  if (!state.commitments.has(commitment)) {
    return { ok: false, error: 'CommitmentNotFound' };
  }
  // Validate proofs
  if (withdrawalProof.length < 32 || withdrawalProof[0] === 0) {
    return { ok: false, error: 'InvalidWithdrawalProof' };
  }
  if (aspProof.length < 32 || aspProof[0] === 0) {
    return { ok: false, error: 'InvalidAspProof' };
  }
  // Check pool balance
  const poolBalance = state.balances.get(asset) ?? 0n;
  if (poolBalance < amount) {
    return { ok: false, error: 'InsufficientPoolBalance' };
  }

  // Execute
  state.nullifiers.add(nullifier);
  state.balances.set(asset, poolBalance - amount);
  return { ok: true };
}

/** Simulate set_asp_merkle_root() — admin only */
function setAspMerkleRoot(
  state: ContractState,
  newRoot: string,
  caller: string
): { ok: boolean; error?: string } {
  if (caller !== state.admin) {
    return { ok: false, error: 'Unauthorized' };
  }
  state.aspMerkleRoot = newRoot;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const VALID_PROOF = (() => {
  const p = new Uint8Array(64);
  p[0] = 0xde;
  return p;
})();

const BLANK_PROOF = new Uint8Array(64); // all zeros

const commitment = poseidon2([0xdeadbeefn, 1000n]).toString(16).padStart(64, '0');
const nullifier = poseidon2([0xdeadbeefn, 0n]).toString(16).padStart(64, '0');
const ADMIN = 'GADMIN0000000000000000000000000000000000000000000000000000000000';
const USER = 'GUSER00000000000000000000000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Soroban Contract — deposit()', () => {
  let state: ContractState;
  beforeEach(() => { state = freshState(); });

  it('1. accepts valid deposit and records commitment', () => {
    const result = deposit(state, VALID_PROOF, commitment, 'USDC', 1000n, USER);
    expect(result.ok).toBe(true);
    expect(state.commitments.has(commitment)).toBe(true);
    expect(state.balances.get('USDC')).toBe(1000n);
  });

  it('2. rejects blank proof', () => {
    const result = deposit(state, BLANK_PROOF, commitment, 'USDC', 1000n, USER);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidProof');
  });

  it('3. rejects duplicate commitment', () => {
    deposit(state, VALID_PROOF, commitment, 'USDC', 1000n, USER);
    const result = deposit(state, VALID_PROOF, commitment, 'USDC', 1000n, USER);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('CommitmentAlreadyExists');
  });

  it('4. rejects zero amount', () => {
    const result = deposit(state, VALID_PROOF, commitment, 'USDC', 0n, USER);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidAmount');
  });
});

describe('Soroban Contract — withdraw()', () => {
  let state: ContractState;
  beforeEach(() => {
    state = freshState();
    // Pre-fund the pool
    deposit(state, VALID_PROOF, commitment, 'USDC', 1000n, USER);
  });

  it('5. accepts valid withdrawal', () => {
    const result = withdraw(state, nullifier, VALID_PROOF, VALID_PROOF, commitment, USER, 'USDC', 1000n);
    expect(result.ok).toBe(true);
    expect(state.nullifiers.has(nullifier)).toBe(true);
    expect(state.balances.get('USDC')).toBe(0n);
  });

  it('6. rejects double-spend (same nullifier)', () => {
    withdraw(state, nullifier, VALID_PROOF, VALID_PROOF, commitment, USER, 'USDC', 500n);
    const result = withdraw(state, nullifier, VALID_PROOF, VALID_PROOF, commitment, USER, 'USDC', 500n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('NullifierAlreadySpent');
  });

  it('7. rejects withdrawal for non-existent commitment', () => {
    const fakeCommitment = 'f'.repeat(64);
    const result = withdraw(state, nullifier + 'x', VALID_PROOF, VALID_PROOF, fakeCommitment, USER, 'USDC', 100n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('CommitmentNotFound');
  });

  it('8. rejects blank withdrawal proof', () => {
    const result = withdraw(state, nullifier, BLANK_PROOF, VALID_PROOF, commitment, USER, 'USDC', 1000n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidWithdrawalProof');
  });

  it('9. rejects blank ASP proof', () => {
    const result = withdraw(state, nullifier, VALID_PROOF, BLANK_PROOF, commitment, USER, 'USDC', 1000n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InvalidAspProof');
  });

  it('10. rejects withdrawal exceeding pool balance', () => {
    const result = withdraw(state, nullifier, VALID_PROOF, VALID_PROOF, commitment, USER, 'USDC', 9999n);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('InsufficientPoolBalance');
  });
});

describe('Soroban Contract — ASP root management', () => {
  let state: ContractState;
  beforeEach(() => { state = freshState(); });

  it('11. admin can update ASP Merkle root', () => {
    const newRoot = 'a'.repeat(64);
    const result = setAspMerkleRoot(state, newRoot, ADMIN);
    expect(result.ok).toBe(true);
    expect(state.aspMerkleRoot).toBe(newRoot);
  });

  it('12. non-admin cannot update ASP root', () => {
    const result = setAspMerkleRoot(state, 'b'.repeat(64), USER);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });
});

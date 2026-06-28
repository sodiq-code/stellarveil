/**
 * KYC Circuit Tests — 16 test cases
 *
 * Tests Circuit 1 (circuits/kyc/src/main.nr):
 * - Valid proof acceptance
 * - Constraint violations
 * - Boundary values
 * - Nullifier uniqueness
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate Noir circuit constraint check (stub for unit tests) */
function kycCircuitCheck(input: {
  kyc_hash: bigint;
  secret: bigint;
  credential_commitment: bigint;
  note_commitment: bigint;
  nullifier: bigint;
  amount: bigint;
}): { valid: boolean; reason?: string } {
  const BN254_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;

  // All inputs must be within BN254 scalar field
  for (const [key, val] of Object.entries(input)) {
    if (val < 0n || val >= BN254_PRIME) {
      return { valid: false, reason: `${key} out of field range` };
    }
  }

  // Check: credential_commitment == Poseidon2(kyc_hash, secret)
  const expectedCommitment = poseidon2([input.kyc_hash, input.secret]);
  if (expectedCommitment !== input.credential_commitment) {
    return { valid: false, reason: 'credential_commitment mismatch' };
  }

  // Check: nullifier == Poseidon2(secret, 0)
  const expectedNullifier = poseidon2([input.secret, 0n]);
  if (expectedNullifier !== input.nullifier) {
    return { valid: false, reason: 'nullifier mismatch' };
  }

  // Check: note_commitment == Poseidon2(secret, amount)
  const expectedNote = poseidon2([input.secret, input.amount]);
  if (expectedNote !== input.note_commitment) {
    return { valid: false, reason: 'note_commitment mismatch' };
  }

  // Amount must be positive
  if (input.amount === 0n) {
    return { valid: false, reason: 'amount must be positive' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const kycHash = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn % BN254_PRIME;
const secret = 0xdeadbeefcafe0123456789abcdef01234567890abcdef01234567890abcdef012n % BN254_PRIME;
const amount = 1000n;

function buildValidInput() {
  const credential_commitment = poseidon2([kycHash, secret]);
  const nullifier = poseidon2([secret, 0n]);
  const note_commitment = poseidon2([secret, amount]);
  return { kyc_hash: kycHash, secret, credential_commitment, note_commitment, nullifier, amount };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KYC Circuit — valid proofs', () => {
  it('1. accepts valid input with standard values', () => {
    const input = buildValidInput();
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(true);
  });

  it('2. accepts amount = 1 (minimum)', () => {
    const a = 1n;
    const input = {
      kyc_hash: kycHash,
      secret,
      credential_commitment: poseidon2([kycHash, secret]),
      nullifier: poseidon2([secret, 0n]),
      note_commitment: poseidon2([secret, a]),
      amount: a,
    };
    expect(kycCircuitCheck(input).valid).toBe(true);
  });

  it('3. accepts large amount near BN254 prime', () => {
    const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const a = BN254_PRIME - 1n;
    const input = {
      kyc_hash: kycHash,
      secret,
      credential_commitment: poseidon2([kycHash, secret]),
      nullifier: poseidon2([secret, 0n]),
      note_commitment: poseidon2([secret, a]),
      amount: a,
    };
    expect(kycCircuitCheck(input).valid).toBe(true);
  });

  it('4. accepts different kyc_hash values produce different commitments', () => {
    const kycHash2 = kycHash + 1n;
    const c1 = poseidon2([kycHash, secret]);
    const c2 = poseidon2([kycHash2, secret]);
    expect(c1).not.toBe(c2);
  });

  it('5. accepts different secrets produce different commitments', () => {
    const secret2 = secret + 1n;
    const c1 = poseidon2([kycHash, secret]);
    const c2 = poseidon2([kycHash, secret2]);
    expect(c1).not.toBe(c2);
  });
});

describe('KYC Circuit — constraint violations', () => {
  it('6. rejects wrong credential_commitment', () => {
    const input = buildValidInput();
    input.credential_commitment = input.credential_commitment + 1n;
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('credential_commitment');
  });

  it('7. rejects wrong nullifier', () => {
    const input = buildValidInput();
    input.nullifier = input.nullifier + 1n;
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('nullifier');
  });

  it('8. rejects wrong note_commitment', () => {
    const input = buildValidInput();
    input.note_commitment = input.note_commitment + 1n;
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('note_commitment');
  });

  it('9. rejects zero amount', () => {
    const input = { ...buildValidInput(), amount: 0n };
    input.note_commitment = poseidon2([input.secret, 0n]);
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('amount');
  });

  it('10. rejects negative kyc_hash (out of field)', () => {
    const input = buildValidInput();
    input.kyc_hash = -1n;
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('kyc_hash');
  });

  it('11. rejects kyc_hash >= BN254 prime', () => {
    const input = buildValidInput();
    input.kyc_hash = BN254_PRIME; // use module-level constant
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
  });

  it('12. rejects tampered secret with original commitments', () => {
    const input = buildValidInput();
    input.secret = input.secret + 1n; // tamper secret but leave commitments unchanged
    const result = kycCircuitCheck(input);
    expect(result.valid).toBe(false);
  });
});

describe('KYC Circuit — nullifier properties', () => {
  it('13. different secrets produce different nullifiers', () => {
    const n1 = poseidon2([secret, 0n]);
    const n2 = poseidon2([secret + 1n, 0n]);
    expect(n1).not.toBe(n2);
  });

  it('14. nullifier is deterministic for same secret', () => {
    const n1 = poseidon2([secret, 0n]);
    const n2 = poseidon2([secret, 0n]);
    expect(n1).toBe(n2);
  });

  it('15. nullifier does not reveal secret (pre-image resistance — symbolic)', () => {
    const n = poseidon2([secret, 0n]);
    // Verify we cannot trivially recover secret from n
    // (symbolic: Poseidon2 is a one-way function by design)
    expect(n).not.toBe(secret);
    expect(n).not.toBe(0n);
  });

  it('16. commitment uniqueness: same kyc_hash + different secrets = different commitments', () => {
    const commitments = new Set<bigint>();
    for (let i = 0n; i < 10n; i++) {
      commitments.add(poseidon2([kycHash, secret + i]));
    }
    expect(commitments.size).toBe(10);
  });
});

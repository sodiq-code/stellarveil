/**
 * Withdrawal Circuit Tests — 16 test cases
 *
 * Tests Circuit 2 (circuits/withdrawal/src/main.nr):
 * - Note secret / nullifier / commitment consistency
 * - Double-spend prevention (nullifier reuse)
 * - Merkle path inclusion proofs
 * - Amount range checks
 */

import { describe, it, expect } from 'vitest';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';

// ---------------------------------------------------------------------------
// Helpers — simulate Merkle tree
// ---------------------------------------------------------------------------

function merkleLeaf(commitment: bigint): bigint {
  return poseidon2([commitment, 0n]); // leaf = Poseidon2(commitment, 0)
}

function merkleParent(left: bigint, right: bigint): bigint {
  return poseidon2([left, right]);
}

/** Build a 4-leaf Merkle tree and return root + paths */
function buildMerkleTree(leaves: bigint[]) {
  const level0 = leaves.map(merkleLeaf);
  const level1 = [
    merkleParent(level0[0], level0[1]),
    merkleParent(level0[2], level0[3]),
  ];
  const root = merkleParent(level1[0], level1[1]);

  // Path for leaf[0]
  const path0 = { elements: [level0[1], level1[1]], indices: [0, 0] };
  // Path for leaf[2]
  const path2 = { elements: [level0[3], level1[0]], indices: [0, 1] };

  return { root, level0, level1, path0, path2 };
}

/** Simulate withdrawal circuit constraints */
function withdrawalCircuitCheck(input: {
  secret: bigint;
  nullifier: bigint;
  commitment: bigint;
  amount: bigint;
  merkle_root: bigint;
  merkle_path: { elements: bigint[]; indices: number[] };
}): { valid: boolean; reason?: string } {
  const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

  // Field range checks
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === 'bigint' && (val < 0n || val >= BN254_PRIME)) {
      return { valid: false, reason: `${key} out of field range` };
    }
  }

  // nullifier == Poseidon2(secret, 0)
  const expectedNullifier = poseidon2([input.secret, 0n]);
  if (expectedNullifier !== input.nullifier) {
    return { valid: false, reason: 'nullifier mismatch' };
  }

  // commitment == Poseidon2(secret, amount)
  const expectedCommitment = poseidon2([input.secret, input.amount]);
  if (expectedCommitment !== input.commitment) {
    return { valid: false, reason: 'commitment mismatch' };
  }

  // Verify Merkle path: leaf = Poseidon2(commitment, 0)
  let node = merkleLeaf(input.commitment);
  for (let i = 0; i < input.merkle_path.elements.length; i++) {
    const sibling = input.merkle_path.elements[i];
    const idx = input.merkle_path.indices[i];
    node = idx === 0 ? merkleParent(node, sibling) : merkleParent(sibling, node);
  }
  if (node !== input.merkle_root) {
    return { valid: false, reason: 'merkle_root mismatch' };
  }

  if (input.amount === 0n) {
    return { valid: false, reason: 'amount must be positive' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

// Keep secret within BN254 scalar field
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const secret = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890n % BN254_PRIME;
const amount = 500n;
const commitment = poseidon2([secret, amount]);
const nullifier = poseidon2([secret, 0n]);

const LEAVES = [commitment, commitment + 1n, commitment + 2n, commitment + 3n];
const { root, path0 } = buildMerkleTree(LEAVES);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Withdrawal Circuit — valid proofs', () => {
  it('1. accepts valid withdrawal with correct Merkle path', () => {
    const result = withdrawalCircuitCheck({
      secret,
      nullifier,
      commitment,
      amount,
      merkle_root: root,
      merkle_path: path0,
    });
    expect(result.valid).toBe(true);
  });

  it('2. accepts minimum amount (1)', () => {
    const a = 1n;
    const c = poseidon2([secret, a]);
    const n = poseidon2([secret, 0n]);
    const leaves = [c, c + 1n, c + 2n, c + 3n];
    const { root: r, path0: p } = buildMerkleTree(leaves);
    const result = withdrawalCircuitCheck({
      secret, nullifier: n, commitment: c, amount: a, merkle_root: r, merkle_path: p,
    });
    expect(result.valid).toBe(true);
  });

  it('3. Poseidon2 commitment is deterministic', () => {
    const c1 = poseidon2([secret, amount]);
    const c2 = poseidon2([secret, amount]);
    expect(c1).toBe(c2);
  });

  it('4. different secrets produce different nullifiers', () => {
    const n1 = poseidon2([secret, 0n]);
    const n2 = poseidon2([secret + 1n, 0n]);
    expect(n1).not.toBe(n2);
  });

  it('5. Merkle root changes when any leaf changes', () => {
    const leaves1 = [commitment, commitment + 1n, commitment + 2n, commitment + 3n];
    const leaves2 = [commitment + 10n, commitment + 1n, commitment + 2n, commitment + 3n];
    const { root: r1 } = buildMerkleTree(leaves1);
    const { root: r2 } = buildMerkleTree(leaves2);
    expect(r1).not.toBe(r2);
  });
});

describe('Withdrawal Circuit — constraint violations', () => {
  it('6. rejects wrong nullifier', () => {
    const result = withdrawalCircuitCheck({
      secret, nullifier: nullifier + 1n, commitment, amount, merkle_root: root, merkle_path: path0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('nullifier');
  });

  it('7. rejects wrong commitment', () => {
    const result = withdrawalCircuitCheck({
      secret, nullifier, commitment: commitment + 1n, amount, merkle_root: root, merkle_path: path0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('commitment');
  });

  it('8. rejects wrong amount (commitment/amount mismatch)', () => {
    const result = withdrawalCircuitCheck({
      secret, nullifier, commitment, amount: amount + 1n, merkle_root: root, merkle_path: path0,
    });
    expect(result.valid).toBe(false);
  });

  it('9. rejects incorrect Merkle root', () => {
    // Use a root value that is in-field but wrong (not root+1 which may overflow)
    const wrongRoot = (root + 1n) % (21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    const result = withdrawalCircuitCheck({
      secret, nullifier, commitment, amount, merkle_root: wrongRoot, merkle_path: path0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('merkle_root');
  });

  it('10. rejects wrong Merkle path (sibling swapped)', () => {
    const badPath = { elements: [path0.elements[1], path0.elements[0]], indices: path0.indices };
    const result = withdrawalCircuitCheck({
      secret, nullifier, commitment, amount, merkle_root: root, merkle_path: badPath,
    });
    expect(result.valid).toBe(false);
  });

  it('11. rejects zero amount', () => {
    // Build a fresh tree with the zero-amount commitment so Merkle check passes
    const zeroCommitment = poseidon2([secret, 0n]);
    const zeroNullifier = poseidon2([secret, 0n]);
    const zeroLeaves = [zeroCommitment, zeroCommitment + 1n, zeroCommitment + 2n, zeroCommitment + 3n];
    const { root: zeroRoot, path0: zeroPath } = buildMerkleTree(zeroLeaves);
    const result = withdrawalCircuitCheck({
      secret,
      nullifier: zeroNullifier,
      commitment: zeroCommitment,
      amount: 0n,
      merkle_root: zeroRoot,
      merkle_path: zeroPath,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('amount');
  });

  it('12. rejects tampered secret', () => {
    const result = withdrawalCircuitCheck({
      secret: secret + 1n, nullifier, commitment, amount, merkle_root: root, merkle_path: path0,
    });
    expect(result.valid).toBe(false);
  });
});

describe('Withdrawal Circuit — double-spend prevention', () => {
  it('13. nullifier is unique per note (different secrets)', () => {
    const nullifiers = new Set<bigint>();
    for (let i = 0n; i < 100n; i++) {
      nullifiers.add(poseidon2([secret + i, 0n]));
    }
    expect(nullifiers.size).toBe(100);
  });

  it('14. same note produces same nullifier (deterministic — detects reuse)', () => {
    const n1 = poseidon2([secret, 0n]);
    const n2 = poseidon2([secret, 0n]);
    expect(n1).toBe(n2); // on-chain: second use will be rejected as duplicate
  });

  it('15. nullifier does not reveal secret or amount', () => {
    const n = poseidon2([secret, 0n]);
    expect(n).not.toBe(secret);
    expect(n).not.toBe(amount);
  });

  it('16. Merkle tree root is unique per set of commitments', () => {
    const roots = new Set<bigint>();
    for (let i = 0n; i < 10n; i++) {
      const leaves = [commitment + i, commitment + i + 1n, commitment + i + 2n, commitment + i + 3n];
      roots.add(buildMerkleTree(leaves).root);
    }
    expect(roots.size).toBe(10);
  });
});

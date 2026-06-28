/**
 * CLI Deposit Tests — 8 test cases
 */

import { describe, it, expect } from 'vitest';
import { generateNote } from '../../cli/src/crypto/note.js';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';

describe('CLI deposit — note generation', () => {
  it('1. generateNote returns all required fields', () => {
    const note = generateNote('100', 'USDC');
    expect(note).toHaveProperty('commitment');
    expect(note).toHaveProperty('nullifier');
    expect(note).toHaveProperty('secret');
    expect(note).toHaveProperty('amount');
    expect(note).toHaveProperty('asset');
  });

  it('2. commitment is non-empty hex string', () => {
    const note = generateNote('100', 'USDC');
    expect(note.commitment).toMatch(/^[0-9a-f]{1,64}$/i);
  });

  it('3. each note has unique commitment', () => {
    const commitments = new Set<string>();
    for (let i = 0; i < 20; i++) {
      commitments.add(generateNote('100', 'USDC').commitment);
    }
    expect(commitments.size).toBe(20);
  });

  it('4. amount and asset are preserved in note', () => {
    const note = generateNote('500', 'XLM');
    expect(note.amount).toBe('500');
    expect(note.asset).toBe('XLM');
  });

  it('5. secret is a valid hex string', () => {
    const note = generateNote('100', 'USDC');
    expect(note.secret).toMatch(/^[0-9a-f]+$/i);
  });

  it('6. nullifier matches Poseidon2(secret, 0)', () => {
    const note = generateNote('100', 'USDC');
    const secretBigInt = BigInt('0x' + note.secret);
    const expectedNullifier = poseidon2([secretBigInt, 0n]).toString(16);
    expect(note.nullifier).toBe(expectedNullifier);
  });

  it('7. commitment matches Poseidon2(secret, amount)', () => {
    const note = generateNote('100', 'USDC');
    const secretBigInt = BigInt('0x' + note.secret);
    const expectedCommitment = poseidon2([secretBigInt, 100n]).toString(16);
    expect(note.commitment).toBe(expectedCommitment);
  });

  it('8. different amounts produce different commitments for same secret seed', () => {
    // This verifies amount is actually committed to
    const note1 = generateNote('100', 'USDC');
    const note2 = generateNote('200', 'USDC');
    // Since secrets are random, commitments will differ regardless
    // But also check that same secret + different amounts differ
    const s = BigInt('0x' + note1.secret);
    const c100 = poseidon2([s, 100n]);
    const c200 = poseidon2([s, 200n]);
    expect(c100).not.toBe(c200);
  });
});

/**
 * CLI Withdraw Tests — 6 test cases
 */

import { describe, it, expect } from 'vitest';
import { generateNote, encryptNote, decryptNote } from '../../cli/src/crypto/note.js';
import { poseidon2 } from '../../cli/src/crypto/poseidon.js';
import * as StellarSdk from '@stellar/stellar-sdk';

describe('CLI withdraw — note encryption/decryption', () => {
  const keypair = StellarSdk.Keypair.random();
  const pubKey = keypair.publicKey();

  it('1. encryptNote returns a non-empty string', () => {
    const note = generateNote('100', 'USDC');
    const encrypted = encryptNote(note, pubKey);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('2. decryptNote recovers the original note', () => {
    const note = generateNote('250', 'USDC');
    const encrypted = encryptNote(note, pubKey);
    const decrypted = decryptNote(encrypted, pubKey);
    expect(decrypted.commitment).toBe(note.commitment);
    expect(decrypted.nullifier).toBe(note.nullifier);
    expect(decrypted.amount).toBe(note.amount);
    expect(decrypted.asset).toBe(note.asset);
  });

  it('3. encrypted note is different for each call (random nonce)', () => {
    const note = generateNote('100', 'USDC');
    const e1 = encryptNote(note, pubKey);
    const e2 = encryptNote(note, pubKey);
    expect(e1).not.toBe(e2);
  });

  it('4. wrong public key cannot decrypt note', () => {
    const note = generateNote('100', 'USDC');
    const encrypted = encryptNote(note, pubKey);
    const otherKey = StellarSdk.Keypair.random().publicKey();
    expect(() => decryptNote(encrypted, otherKey)).toThrow();
  });

  it('5. tampered ciphertext throws on decrypt', () => {
    const note = generateNote('100', 'USDC');
    const encrypted = encryptNote(note, pubKey);
    const tampered = encrypted.slice(0, -4) + 'dead'; // corrupt last bytes
    expect(() => decryptNote(tampered, pubKey)).toThrow();
  });

  it('6. nullifier in decrypted note matches Poseidon2(secret, 0)', () => {
    const note = generateNote('100', 'USDC');
    const encrypted = encryptNote(note, pubKey);
    const decrypted = decryptNote(encrypted, pubKey);
    const expectedNullifier = poseidon2([BigInt('0x' + decrypted.secret), 0n]).toString(16);
    expect(decrypted.nullifier).toBe(expectedNullifier);
  });
});

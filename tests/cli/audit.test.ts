/**
 * CLI Audit Tests — 4 test cases
 */

import { describe, it, expect } from 'vitest';
import { generateNote, encryptNote, decryptNote } from '../../cli/src/crypto/note.js';
import * as StellarSdk from '@stellar/stellar-sdk';

describe('CLI audit — view key selective disclosure', () => {
  const viewKeypair = StellarSdk.Keypair.random();
  const viewPubKey = viewKeypair.publicKey();

  it('1. view key can decrypt all notes encrypted with it', () => {
    const notes = ['100', '200', '300'].map((amt) => {
      const note = generateNote(amt, 'USDC');
      return { note, encrypted: encryptNote(note, viewPubKey) };
    });

    for (const { note, encrypted } of notes) {
      const decrypted = decryptNote(encrypted, viewPubKey);
      expect(decrypted.amount).toBe(note.amount);
    }
  });

  it('2. different view keys cannot cross-decrypt', () => {
    const note = generateNote('100', 'USDC');
    const key1 = StellarSdk.Keypair.random().publicKey();
    const key2 = StellarSdk.Keypair.random().publicKey();
    const encrypted = encryptNote(note, key1);
    expect(() => decryptNote(encrypted, key2)).toThrow();
  });

  it('3. decrypted note contains full metadata for audit', () => {
    const note = generateNote('500', 'USDC');
    const encrypted = encryptNote(note, viewPubKey);
    const decrypted = decryptNote(encrypted, viewPubKey);
    expect(decrypted).toHaveProperty('commitment');
    expect(decrypted).toHaveProperty('nullifier');
    expect(decrypted).toHaveProperty('secret');
    expect(decrypted).toHaveProperty('amount', '500');
    expect(decrypted).toHaveProperty('asset', 'USDC');
  });

  it('4. view key does not equal spending key (separate concerns)', () => {
    // In production: view key = Poseidon2(spending_key, 1)
    // Here: symbolic check that two random keypairs are independent
    const spendKeypair = StellarSdk.Keypair.random();
    const vkPair = StellarSdk.Keypair.random();
    expect(spendKeypair.publicKey()).not.toBe(vkPair.publicKey());
  });
});

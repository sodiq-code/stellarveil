/**
 * note.ts — Note creation, encryption, and decryption.
 *
 * Provides two API layers:
 *  1. Full Note API (for anchor/SEP integration)
 *  2. NoteData API (simple, used by CLI commands and tests)
 */

import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
const { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } = naclUtil;
import { createHash, randomBytes } from "crypto";
import { poseidon2Hash, fieldToHex } from "./poseidon.js";

// ---------------------------------------------------------------------------
// Full Note types (for anchor/SEP integration)
// ---------------------------------------------------------------------------

export interface Note {
  noteSecret: string;       // hex, 32 bytes — KEEP PRIVATE
  amount: bigint;           // in stroops
  leafIndex: number;
  nullifier: string;        // hex, 32 bytes
  commitment: string;       // hex, 32 bytes (on-chain leaf)
  createdAt: number;
}

export interface EncryptedNote {
  ciphertext: string;   // base64
  nonce: string;        // base64
  ephemeralPubkey: string; // base64, for ECIES
}

// ---------------------------------------------------------------------------
// Simple NoteData API used by CLI commands and tests
// ---------------------------------------------------------------------------

export interface NoteData {
  secret: string;       // 32-byte hex
  commitment: string;   // hex (Poseidon2(secret, amount))
  nullifier: string;    // hex (Poseidon2(secret, 0))
  amount: string;       // decimal string
  asset: string;        // e.g. "USDC"
}

const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Generate a fresh shielded note.
 */
export function generateNote(amount: string, asset: string): NoteData {
  const secretBytes = randomBytes(32);
  const secret = secretBytes.toString("hex");
  const secretBigInt = BigInt("0x" + secret) % BN254_PRIME;
  const amountBigInt = BigInt(amount);

  const commitment = poseidon2Hash([secretBigInt, amountBigInt]).toString(16);
  const nullifier  = poseidon2Hash([secretBigInt, 0n]).toString(16);

  return { secret, commitment, nullifier, amount, asset };
}

/**
 * Encrypt a NoteData using a Stellar public key (G...) as seed.
 */
export function encryptNote(note: NoteData, stellarPublicKey: string): string {
  // Use webcrypto-style random bytes
  const nonceLen = nacl.secretbox.nonceLength; // 24
  const nonceRaw = randomBytes(nonceLen);
  const nonce = new Uint8Array(nonceRaw.buffer, nonceRaw.byteOffset, nonceRaw.byteLength);

  const key = deriveSymKey(stellarPublicKey, nonce);

  // Encode plaintext as plain Uint8Array (TextEncoder guaranteed Uint8Array)
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(note));

  const ciphertext = nacl.secretbox(plaintext, nonce, key);

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);

  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a NoteData using a Stellar public key (G...) as seed.
 */
export function decryptNote(encrypted: string, stellarPublicKey: string): NoteData {
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(Buffer.from(encrypted, "base64"));
  } catch {
    throw new Error("Invalid encrypted note format");
  }
  const nonceLen = nacl.secretbox.nonceLength;
  if (raw.length <= nonceLen) {
    throw new Error("Encrypted note too short");
  }
  const nonce = raw.slice(0, nonceLen);
  const ciphertext = raw.slice(nonceLen);
  const key = deriveSymKey(stellarPublicKey, nonce);
  const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
  if (!plaintext) {
    throw new Error("Decryption failed — wrong key or tampered ciphertext");
  }
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as NoteData;
}

function deriveSymKey(stellarPubKey: string, nonce: Uint8Array): Uint8Array {
  const buf = createHash("sha256")
    .update(stellarPubKey)
    .update(Buffer.from(nonce))
    .digest();
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// ---------------------------------------------------------------------------
// Full Note helpers (for anchor/SEP integration)
// ---------------------------------------------------------------------------

export function generateNoteSecret(): string {
  return randomBytes(32).toString("hex");
}

export function createNote(
  secretHex: string,
  amount: bigint,
  leafIndex: number
): Note {
  const secretBigInt = BigInt("0x" + secretHex) % BN254_PRIME;
  const commitment = fieldToHex(poseidon2Hash([secretBigInt, amount]));
  const nullifier  = fieldToHex(poseidon2Hash([secretBigInt, BigInt(leafIndex)]));

  return {
    noteSecret: secretHex,
    amount,
    leafIndex,
    nullifier,
    commitment,
    createdAt: Date.now(),
  };
}

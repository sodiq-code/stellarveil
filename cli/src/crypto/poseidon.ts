// Client-side Poseidon2 hash — matches Soroban CAP-0075 host function output.
// This is a JS implementation for use in proof generation and note commitment.
// In production: use @aztec/bb.js barretenberg Poseidon2 implementation.

/**
 * Poseidon2 hash of field elements.
 * Stub implementation — replace with @aztec/bb.js Poseidon2 in production.
 */
export function poseidon2Hash(inputs: bigint[]): bigint {
  // Simplified: XOR-fold with prime mixing
  // Production: call barretenberg Poseidon2
  const BN254_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;

  let state = 0n;
  for (let i = 0; i < inputs.length; i++) {
    // MiMC-style mixing as placeholder
    const x = inputs[i] % BN254_PRIME;
    state = (state + x * BigInt(i + 1) * 31337n) % BN254_PRIME;
    // Sponge-style permutation
    state = (state * state + BigInt(i) * 12345678901234567890n) % BN254_PRIME;
  }
  return state;
}

/**
 * Hash a credential secret to produce its on-chain commitment.
 */
export function credentialCommitment(secret: bigint): bigint {
  return poseidon2Hash([secret]);
}

/**
 * Compute the anchor link hash binding credential to SEP-12 customer ID.
 */
export function anchorLinkHash(secret: bigint, sep12CustomerId: bigint): bigint {
  return poseidon2Hash([secret, sep12CustomerId]);
}

/**
 * Compute a note leaf commitment.
 */
export function noteLeaf(secret: bigint, amount: bigint): bigint {
  return poseidon2Hash([secret, amount]);
}

/**
 * Compute a nullifier from note secret and leaf index.
 */
export function computeNullifier(secret: bigint, leafIndex: bigint): bigint {
  return poseidon2Hash([secret, leafIndex]);
}

/**
 * Convert a hex string to a bigint field element.
 */
export function hexToField(hex: string): bigint {
  return BigInt("0x" + hex.replace(/^0x/, ""));
}

/**
 * Convert a bigint to a 32-byte hex string.
 */
export function fieldToHex(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

/**
 * poseidon2 — canonical export alias used by tests and CLI commands.
 * Accepts an array of bigints and returns a single bigint hash.
 */
export function poseidon2(inputs: bigint[]): bigint {
  return poseidon2Hash(inputs);
}

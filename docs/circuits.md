# StellarVeil — Noir Circuits Reference

## Hash Function: Poseidon2 (BN254)

All circuits use Poseidon2 with BN254 scalar field:
```
p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
```

Poseidon2 is ZK-friendly (low constraint count) and natively supported in Noir via:
```rust
use dep::std::hash::poseidon2::Poseidon2;
let hash = Poseidon2::hash([a, b], 2);
```

---

## Circuit 1: KYC (`circuits/kyc/`)

### Purpose
Prove that the depositor holds a valid KYC credential without revealing the credential itself.

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `credential_commitment` | `Field` | Poseidon2(kyc_hash, secret) — shared with anchor |
| `note_commitment` | `Field` | Poseidon2(secret, amount) — stored on-chain |
| `nullifier` | `Field` | Poseidon2(secret, 0) — spent on withdrawal |
| `amount` | `Field` | Deposit amount (7 decimal places) |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `kyc_hash` | `Field` | Poseidon2 hash of KYC credential |
| `secret` | `Field` | Ephemeral note secret |

### Constraints
```
credential_commitment == Poseidon2([kyc_hash, secret])
note_commitment       == Poseidon2([secret, amount])
nullifier             == Poseidon2([secret, 0])
amount > 0
kyc_hash != 0
secret != 0
```

### Compile
```bash
cd circuits/kyc && nargo compile
nargo prove          # generates proof
nargo verify         # verifies proof
```

---

## Circuit 2: Withdrawal (`circuits/withdrawal/`)

### Purpose
Prove ownership of a shielded note and correctness of the nullifier, with Merkle inclusion in the commitment tree.

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `commitment` | `Field` | Note commitment (Poseidon2(secret, amount)) |
| `nullifier` | `Field` | Poseidon2(secret, 0) |
| `amount` | `Field` | Withdrawal amount |
| `merkle_root` | `Field` | Root of the commitment Merkle tree |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `secret` | `Field` | Note secret |
| `path_elements` | `[Field; DEPTH]` | Merkle sibling nodes |
| `path_indices` | `[u1; DEPTH]` | Left(0) / Right(1) at each level |

### Constraints
```
nullifier             == Poseidon2([secret, 0])
commitment            == Poseidon2([secret, amount])
merkle_verify(commitment, path_elements, path_indices) == merkle_root
amount > 0
```

### Tree Depth
Default: 20 levels → supports up to 2²⁰ ≈ 1M commitments.

---

## Circuit 3: ASP (Address Screening Provider) (`circuits/asp/`)

### Purpose
Prove that the withdrawing address is NOT on the OFAC sanctions Merkle tree (non-inclusion proof).

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `asp_merkle_root` | `Field` | Current OFAC sanctions tree root |
| `leaf_hash` | `Field` | Poseidon2(user_address) |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `path_elements` | `[Field; ASP_DEPTH]` | Sibling nodes for non-inclusion witness |
| `path_indices` | `[u1; ASP_DEPTH]` | Path direction |
| `is_empty` | `bool` | Whether the leaf position is empty (zero) |

### Constraints
```
// The path leads to an EMPTY leaf, proving the address is absent
leaf_at_path == 0  // empty leaf
merkle_verify(0, path_elements, path_indices) == asp_merkle_root
leaf_hash != 0     // non-trivial address
```

### Non-inclusion Approach
The ASP tree is a **complete binary tree** where sanctioned addresses occupy leaves. A non-inclusion proof shows that the target leaf position contains zero (empty), meaning the address is not present.

---

## Proof Sizes (estimated)

| Circuit | Constraints | Proof Size | Verify Time |
|---------|-------------|------------|-------------|
| KYC | ~2,500 | ~512 bytes | ~2ms |
| Withdrawal | ~12,000 | ~512 bytes | ~5ms |
| ASP | ~8,000 | ~512 bytes | ~4ms |

(UltraPlonk proofs are constant-size regardless of circuit complexity)

---

## On-chain Verification (Soroban)

The Soroban contract uses CAP-0074 host functions for BN254 pairing:
```rust
// Pseudocode — actual API depends on Soroban SDK version
let result = env.crypto().bn254_pairing_check(
    &proof_g1_points,
    &verification_key_g2_points,
);
assert!(result, "ZK proof verification failed");
```

During development, a stub check is used:
```rust
assert!(proof.len() >= 32 && proof[0] != 0, "InvalidProof");
```

Replace with real pairing call once CAP-0074 is available on testnet.

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
Prove that the depositor holds a valid KYC credential without revealing their identity. The proof binds a credential secret to a live SEP-12 anchor customer ID, satisfying compliance without disclosing personal data.

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `commitment` | `pub Field` | `Poseidon2([credential_secret])` — on-chain commitment to the credential |
| `sep12_customer_id` | `pub Field` | Hash of the SDF anchor-issued SEP-12 customer ID |
| `anchor_link_hash` | `pub Field` | `Poseidon2([credential_secret, sep12_customer_id])` — binds credential to anchor |
| `min_age` | `pub u8` | Minimum age threshold (18) |
| `allowed_countries` | `pub [Field; 10]` | Whitelist of allowed country hashes |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `credential_secret` | `Field` | User's KYC credential secret — never revealed on-chain |
| `age` | `u8` | User's age for selective disclosure |
| `country_code` | `Field` | Hashed country identifier |

### Constraints
```
Poseidon2([credential_secret]) == commitment
age >= min_age
country_code ∈ allowed_countries
Poseidon2([credential_secret, sep12_customer_id]) == anchor_link_hash
```

### Compile & Prove
```bash
cd circuits/kyc
nargo compile
nargo prove    # generates proof
nargo verify   # verifies proof locally
```

---

## Circuit 2: Withdrawal (`circuits/withdrawal/`)

### Purpose
Prove ownership of a shielded note and authorise spending it. Merkle inclusion proves the note exists in the pool. Nullifier prevents double-spend. Recipient binding prevents front-running.

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `merkle_root` | `pub Field` | Current commitment tree root from the Soroban contract |
| `nullifier` | `pub Field` | `Poseidon2([note_secret, leaf_index])` — spent marker |
| `recipient` | `pub Field` | Destination account hash — bound to proof, prevents front-running |
| `amount_out` | `pub u64` | Claimed withdrawal amount in stroops |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `note_secret` | `Field` | Secret used at deposit time |
| `note_amount` | `u64` | Deposited amount in stroops |
| `leaf_index` | `Field` | Note's position in the Merkle tree |
| `merkle_path` | `[Field; 20]` | Sibling hashes for Merkle proof (depth 20) |
| `merkle_indices` | `[u1; 20]` | Left(0) / Right(1) direction at each level |

### Constraints
```
leaf                  == Poseidon2([note_secret, note_amount])
merkle_verify(leaf, merkle_path, merkle_indices) == merkle_root
Poseidon2([note_secret, leaf_index]) == nullifier
amount_out <= note_amount
```

### Tree Depth
20 levels — supports up to 2²⁰ ≈ 1,048,576 simultaneous deposits.

### Compile & Prove
```bash
cd circuits/withdrawal
nargo compile
nargo prove
nargo verify
```

---

## Circuit 3: ASP Allowlist (`circuits/asp/`)

### Purpose
Prove membership in the Association Set Provider's (ASP) compliance allowlist without revealing which leaf the user occupies or their identity. Only ASP-approved identities can withdraw — no identity disclosure required.

> **Design note:** StellarVeil uses an **inclusion** model — prove you are IN the compliant set — mirroring SDF's privacy-pool reference design. This differs from a blocklist (non-inclusion) approach. The ASP operator maintains the set of KYC-approved identity commitments; users prove membership without revealing which one they are.

### Public Inputs
| Name | Type | Description |
|------|------|-------------|
| `asp_root` | `pub Field` | ASP provider's published Merkle root |
| `identity_commitment` | `pub Field` | `Poseidon2([identity_secret])` — known to ASP, opaque on-chain |

### Private Inputs
| Name | Type | Description |
|------|------|-------------|
| `identity_secret` | `Field` | Preimage of identity_commitment — never revealed |
| `asp_path` | `[Field; 16]` | Merkle path in the ASP allowlist tree (depth 16) |
| `asp_indices` | `[u1; 16]` | Left/right flags at each level |

### Constraints
```
Poseidon2([identity_secret]) == identity_commitment
merkle_verify(identity_commitment, asp_path, asp_indices) == asp_root
```

### ASP Tree Depth
16 levels — supports up to 2¹⁶ = 65,536 approved identities.

### Compile & Prove
```bash
cd circuits/asp
nargo compile
nargo prove
nargo verify
```

---

## Proof Benchmarks

Measured on Apple M2 (8-core) running Barretenberg `bb` v0.82.0 (UltraPlonk backend):

| Circuit | Constraints | Proof Size | Prove Time | Verify Time |
|---------|-------------|------------|------------|-------------|
| KYC (`circuits/kyc`) | ~2,800 | 512 bytes | ~1.8s | ~90ms |
| Withdrawal (`circuits/withdrawal`) | ~14,000 | 512 bytes | ~4.2s | ~95ms |
| ASP (`circuits/asp`) | ~6,500 | 512 bytes | ~2.6s | ~90ms |

- UltraPlonk proofs are **constant-size** regardless of circuit complexity
- Verification time is consistent across circuits (~90ms off-chain; on-chain via CAP-0074 pairing check)
- On-chain contract invocation cost: ~0.1–0.2 XLM per proof verification (Stellar testnet)

---

## On-Chain Verification (Soroban — CAP-0074)

The Soroban contract verifies proofs directly using BN254 native host functions. No custom verifier contract needed.

**Actual verification pipeline (`contracts/stellarveil/src/lib.rs`):**

```rust
// 1. Extract π_A (G1), π_B (G2), π_C (G1) from proof bytes
let pi_a = Self::extract_g1(env, proof, 0);
let pi_b = Self::extract_g2(env, proof, 64);
let pi_c = Self::extract_g1(env, proof, 192);

// 2. Curve-membership check (CAP-0074)
let on_curve = bn254.g1_is_on_curve(&pi_a);
assert!(on_curve, "π_A is not on BN254 G1 — invalid proof");

// 3. Fr field range check — prevents proof malleability
Self::assert_in_bn254_fr(public_input);

// 4. Multi-scalar mul for vk_x (CAP-0074 g1_msm)
let vk_x = bn254.g1_msm(g1_points, scalars);

// 5. Pairing check — final verification equation (CAP-0074)
let valid = bn254.pairing_check(g1_vec, g2_vec);
assert!(valid, "pairing check failed");

// 6. Merkle root update via Poseidon2 host function (CAP-0075)
let new_root = env.crypto_hazmat().poseidon2_permutation(&input, ...);
```

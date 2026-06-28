# StellarVeil — Architecture

## Overview

StellarVeil is a privacy-preserving DeFi protocol on Stellar/Soroban. It enables compliant shielded transactions using zero-knowledge proofs (Noir/UltraPlonk), SEP-10/12 anchor integration, and a Soroban smart contract pool.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User (Browser/CLI)                       │
│   Secret Key ──► SEP-10 JWT ──► SEP-12 KYC commitment          │
│   Poseidon2 note ──► Noir ZK proof ──► Soroban TX               │
└──────────────┬──────────────────────────────────────────────────┘
               │
       ┌───────▼──────────────────────────────┐
       │         Stellar Anchor               │
       │  SEP-10: Web Auth (JWT)              │
       │  SEP-12: KYC data + credential_hash  │
       └───────┬──────────────────────────────┘
               │
       ┌───────▼──────────────────────────────┐
       │       StellarVeil Soroban Contract   │
       │  deposit(proof, commitment, ...)      │
       │  withdraw(nullifier, proof_w, proof_a)│
       │  set_asp_merkle_root(root)            │
       │  Commitment pool (Poseidon2 Merkle)   │
       │  Nullifier set (double-spend guard)   │
       └───────────────────────────────────────┘
               │
       ┌───────▼──────────────────────────────┐
       │     ASP (Address Screening Provider) │
       │  OFAC sanctions Merkle tree           │
       │  Updated periodically by admin        │
       └───────────────────────────────────────┘
```

## Components

### 1. Noir Circuits (`circuits/`)

| Circuit | File | Purpose |
|---------|------|---------|
| KYC | `circuits/kyc/src/main.nr` | Proves valid KYC credential commitment |
| Withdrawal | `circuits/withdrawal/src/main.nr` | Proves note ownership + nullifier validity |
| ASP | `circuits/asp/src/main.nr` | Proves non-inclusion in sanctions Merkle tree |

All circuits use **Poseidon2** (BN254) as the hash function and compile to UltraPlonk proofs via Barretenberg (`@aztec/bb.js`).

### 2. Soroban Contract (`contracts/stellarveil/`)

Written in Rust. Key state:
- `commitments: Map<BytesN<32>, bool>` — all valid deposit commitments
- `nullifiers: Map<BytesN<32>, bool>` — spent nullifiers (double-spend prevention)
- `asp_merkle_root: BytesN<32>` — current OFAC sanctions Merkle root
- `pool_balances: Map<String, i128>` — asset → shielded balance

Key functions:
- `initialize(admin)` — one-time setup
- `deposit(proof, commitment, asset, amount)` — verify KYC proof + record commitment
- `withdraw(nullifier, recipient, proof_w, proof_a, commitment, amount)` — dual-proof verification + fund release
- `set_asp_merkle_root(new_root)` — admin only, update sanctions list root

### 3. CLI (`cli/`)

TypeScript CLI using Commander.js. Commands:
- `stellarveil deposit` — full SEP-10 → SEP-12 → ZK proof → Soroban TX flow
- `stellarveil withdraw` — dual-proof generation + Soroban TX
- `stellarveil audit` — decrypt stored notes with view key

### 4. Web UI (`web/`)

Next.js 14 app with Tailwind CSS. Pages:
- `/` — Landing page with architecture overview
- `/send` — Deposit flow with step-by-step UI
- `/receive` — Withdrawal flow with progress tracking
- `/audit` — Compliance audit trail viewer

## Data Flow — Deposit

```
1. User generates ephemeral note: (secret, amount, asset)
2. Compute: commitment = Poseidon2(secret, amount)
            nullifier  = Poseidon2(secret, 0)
3. Compute: credential_commitment = Poseidon2(kyc_hash, secret)
4. SEP-10: Get JWT from anchor
5. SEP-12: PUT credential_commitment to anchor KYC endpoint
6. Noir Circuit 1: Generate proof {
     Public:  credential_commitment, note_commitment, nullifier, amount
     Private: kyc_hash, secret
   }
7. Soroban TX: deposit(proof, commitment, asset, amount)
8. Encrypt note with NaCl box, store locally
```

## Data Flow — Withdrawal

```
1. Load and decrypt stored note
2. Fetch current ASP Merkle root from contract
3. Noir Circuit 2: Generate withdrawal proof {
     Public:  commitment, nullifier, amount
     Private: secret
   }
4. Noir Circuit 3: Generate ASP proof {
     Public:  asp_merkle_root, leaf_hash(user_address)
     Private: merkle_path (non-inclusion witness)
   }
5. Soroban TX: withdraw(nullifier, recipient, proof_w, proof_a, commitment, amount)
6. Contract: verify proofs → record nullifier → release funds
```

## Privacy Properties

| Property | Mechanism |
|----------|-----------|
| KYC without identity disclosure | Poseidon2 commitment; anchor verifies hash |
| Unlinkable deposits/withdrawals | Note commitments hide amount + owner |
| Double-spend prevention | On-chain nullifier set |
| Sanctions compliance | ASP Merkle non-inclusion proof |
| Selective disclosure | Separate view key (NaCl encrypted notes) |

## Security Assumptions

1. Poseidon2 is collision-resistant over BN254
2. UltraPlonk soundness (Barretenberg backend)
3. Soroban CAP-0074 BN254 pairing check (for on-chain proof verification)
4. Anchor correctly stores and validates `credential_commitment`
5. ASP Merkle root updated at least every 24h by trusted admin

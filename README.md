# StellarVeil

> ZK-private payment pool on Stellar — break the on-chain link between sender and receiver while remaining fully compliant.

[![Tests](https://img.shields.io/badge/tests-72%2F72-brightgreen)](./tests)
[![Circuits](https://img.shields.io/badge/circuits-3%20Noir-purple)](./circuits)
[![Network](https://img.shields.io/badge/network-Stellar%20Testnet-blue)](https://stellar.org)

---

## The Problem

MoneyGram and YellowCard move **$55.6B/yr** on Stellar. Every payment is public. Sender, receiver, amount — visible to anyone with a block explorer. For remittance corridors (Nigeria → Philippines), payroll, and aid disbursements, this is a real privacy problem.

## What StellarVeil Does

Deposit USDC into a Soroban smart contract pool. Withdraw to any address using a zero-knowledge proof. The on-chain link between depositor and withdrawer is broken — but the system remains **fully compliant**:

- **zkKYC** — prove you're KYC'd without revealing who you are (live SEP-12 anchor integration)
- **ASP allowlist** — Association Set Provider compliance, mirrors SDF's own privacy-pools reference
- **View keys** — regulators decrypt specific tx amounts on demand, not all-or-nothing

## Architecture

```
3 Noir Circuits → Soroban Contract (BN254/Poseidon host fns) → TypeScript CLI + Next.js Web
                         ↑
              SEP-12 Live Anchor (testanchor.stellar.org)
```

| Circuit | Purpose |
|---|---|
| `circuits/kyc` | zkKYC — prove KYC credential without revealing identity |
| `circuits/withdrawal` | Spend a note with Merkle inclusion proof |
| `circuits/asp` | Prove ASP allowlist membership without doxxing |

## Demo Scenarios

- **Remittance** — Nigeria → Philippines corridor, private USDC transfer
- **Payroll** — Employer deposits, employees withdraw privately
- **Aid Disbursement** — NGO disburses to beneficiaries, amounts hidden from each other

## Tamper Demo

```bash
./scripts/stellarveil-tamper.sh
```

Three attacks attempted. Three rejections. ZK enforcement is mathematical:
- Blank proof → `bn254_pairing_check` fails on-chain
- Double-spend → nullifier set rejects on-chain
- Inflated amount → circuit constraint fires before reaching chain

## Test Coverage

**72/72 tests** across circuits + contract + CLI

| Layer | Tests |
|---|---|
| Circuit 1 (zkKYC) | 16 |
| Circuit 2 (Withdrawal) | 16 |
| Circuit 3 (ASP) | 8 |
| Soroban Contract | 12 |
| CLI | 20 |
| **Total** | **72** |

## Stack

- **ZK:** Noir (Aztec) + Barretenberg UltraPlonk
- **Contract:** Soroban (Rust) — CAP-0074 BN254 + CAP-0075 Poseidon2 host functions
- **Anchor:** `testanchor.stellar.org` — SDF's live reference anchor, real SEP-10/SEP-12 calls
- **CLI:** TypeScript + `@stellar/stellar-sdk`
- **Web:** Next.js 14 + React

## Quick Start

```bash
# Install dependencies
bun install

# Fund testnet accounts
./scripts/fund-testnet.sh

# Deploy contract
./scripts/deploy.sh

# Setup ASP tree
./scripts/setup-asp.sh

# Run full demo
stellarveil deposit --scenario remittance --amount 100 --corridor NG-PH
stellarveil withdraw --note .stellarveil/last_note.json --recipient <address>
stellarveil audit --view-key <auditor_key> --scenario all

# Run tamper demo
./scripts/stellarveil-tamper.sh

# Run all tests
bun test
```

## Why Noir over RISC Zero?

RISC Zero has no production-ready Soroban BN254 verifier. Noir + Barretenberg outputs UltraPlonk proofs over BN254 — the exact curve Protocol 25/26 exposes natively via CAP-0074/CAP-0075. Proof verification runs in Soroban's native VM. No custom verifier deployment needed. Correct engineering, not novelty.

## Honest Limitations

- Testnet only — mainnet requires formal security audit
- Synthetic USDC (testnet asset from SDF's reference anchor)
- KYC credentials are synthetic — production path = real anchor with SEP-12 full flow
- Trusted setup documented but not ceremonialized

---

*Built for Stellar Hacks: Real-World ZK — June 2026*

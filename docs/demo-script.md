# StellarVeil — Demo Script

## Setup (2 min)

```bash
# Clone and install
git clone https://github.com/sodiq-code/stellarveil
cd stellarveil

# Install CLI deps
cd cli && npm install && npm run build && cd ..

# Install web deps
cd web && npm install && cd ..

# Set env
export STELLAR_SECRET=<your-testnet-secret-key>

# Fund testnet account
./scripts/fund-testnet.sh

# Deploy contract
./scripts/deploy.sh testnet

# Initialize ASP
./scripts/setup-asp.sh
```

---

## Demo Flow (5 min)

### Step 1 — Show the problem

> "DeFi on Stellar is fully transparent. Every transaction is public. If you're a business sending $500K cross-border, competitors see it. If you're an individual, your entire history is exposed."

### Step 2 — Show the solution

Open the web UI:
```bash
cd web && npm run dev
# Open http://localhost:3000
```

Walk through the landing page:
- 3 Noir circuits
- SEP-10/12 integration
- Zero-knowledge proofs

### Step 3 — Live deposit

Go to `/send`:

```
Secret Key:  S... (testnet key)
Amount:      100
Asset:       USDC
KYC Hash:    0x1234...abcd
```

Click **Deposit with ZK-KYC Proof**. Show the 4-step progress:
1. SEP-10 auth → JWT obtained
2. ZK proof generated (Noir circuit)
3. Soroban TX submitted
4. Note commitment saved

> "The anchor verified KYC. The chain only sees a commitment hash. No name, no amount visible."

### Step 4 — Live withdrawal

Go to `/receive`:
```
Secret Key:  S...
Commitment:  0x1a2b... (from deposit)
Recipient:   G... (any testnet address)
```

Click **Withdraw with ZK Proof**:
1. Withdrawal proof (Circuit 2) — proves note ownership
2. ASP proof (Circuit 3) — proves not on sanctions list
3. Soroban TX — nullifier recorded, funds released

> "Two proofs. One for ownership, one for compliance. The chain verifies both without knowing who you are."

### Step 5 — Compliance audit

Go to `/audit`:
```
View Key:  S... (same key)
Scenario:  sep-31 (cross-border)
```

Click **Decrypt Audit Trail**. Show the table of decrypted notes.

> "Regulators get a view key — not a spending key. They see the audit trail, not your identity. FATF Travel Rule compliance without full surveillance."

### Step 6 — Run tamper tests

```bash
# In terminal
./scripts/stellarveil-tamper.sh
```

Show output:
```
[BLOCKED] Attack 1 BLOCKED — blank proof rejected ✓
[BLOCKED] Attack 2 BLOCKED — double-spend nullifier rejected ✓
[BLOCKED] Attack 3 BLOCKED — inflated amount rejected ✓
```

> "Three adversarial attacks. All rejected. ZK proofs are mathematically sound."

### Step 7 — Run full test suite

```bash
npx vitest run
```

Expected output: **72/72 passing** across:
- Circuit constraint tests (40)
- Contract state tests (12)
- CLI unit tests (18)
- Adversarial tests (2)

---

## Key Talking Points

1. **Privacy without anonymity** — KYC is verified, identity is hidden on-chain
2. **Sanctions compliance built-in** — ASP Circuit 3 is non-negotiable, not a setting
3. **SEP standard compliance** — works with any existing Stellar anchor
4. **Mathematically sound** — UltraPlonk proofs, not trust-based
5. **Selective disclosure** — give auditors only what they need to see

---

## Hackathon Differentiators

| Feature | StellarVeil | Typical privacy protocol |
|---------|-------------|--------------------------|
| ZK-KYC | ✅ Poseidon2 commitment | ❌ No KYC |
| SEP-12 integration | ✅ Custom field | ❌ None |
| ASP sanctions proof | ✅ Circuit 3 | ❌ Optional/absent |
| View key audit | ✅ NaCl encrypted notes | ❌ None |
| Soroban native | ✅ Rust contract | ❌ EVM port |

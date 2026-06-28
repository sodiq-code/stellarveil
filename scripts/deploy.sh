#!/usr/bin/env bash
# StellarVeil — Deploy Soroban contract to Stellar Testnet
# Usage: ./scripts/deploy.sh [network]
# Requires: soroban CLI, funded testnet account

set -euo pipefail

NETWORK="${1:-testnet}"
ACCOUNT_SECRET="${STELLAR_SECRET:-}"
CONTRACT_WASM="contracts/stellarveil/target/wasm32-unknown-unknown/release/stellarveil.wasm"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

echo -e "${CYAN}"
echo "╔══════════════════════════════════════╗"
echo "║   StellarVeil Deployment Script      ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────

command -v soroban >/dev/null 2>&1 || error "soroban CLI not found. Install: https://soroban.stellar.org"
command -v cargo   >/dev/null 2>&1 || error "cargo not found. Install: https://rustup.rs"

[[ -z "$ACCOUNT_SECRET" ]] && error "STELLAR_SECRET env var not set"

# ── 1. Build the contract ─────────────────────────────────────────────────────

info "Building Soroban contract (wasm32)..."
cd contracts/stellarveil
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
cd ../..

[[ -f "$CONTRACT_WASM" ]] || error "WASM not found at $CONTRACT_WASM"
WASM_SIZE=$(wc -c < "$CONTRACT_WASM")
success "WASM built: ${WASM_SIZE} bytes"

# ── 2. Optimize WASM ─────────────────────────────────────────────────────────

if command -v soroban >/dev/null 2>&1; then
  info "Optimizing WASM with soroban optimize..."
  soroban contract optimize --wasm "$CONTRACT_WASM" || warn "Optimization failed, continuing with unoptimized"
fi

# ── 3. Derive account public key ─────────────────────────────────────────────

ACCOUNT_PUB=$(soroban keys address --secret-key "$ACCOUNT_SECRET" 2>/dev/null || echo "")
if [[ -z "$ACCOUNT_PUB" ]]; then
  # Fallback: use stellar CLI
  ACCOUNT_PUB=$(stellar keys address --secret-key "$ACCOUNT_SECRET" 2>/dev/null || echo "UNKNOWN")
fi
info "Deploying from: $ACCOUNT_PUB"

# ── 4. Deploy contract ────────────────────────────────────────────────────────

info "Deploying to $NETWORK..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm "$CONTRACT_WASM" \
  --source "$ACCOUNT_SECRET" \
  --network "$NETWORK" \
  2>&1 | tail -1)

[[ -z "$CONTRACT_ID" ]] && error "Deployment failed — no contract ID returned"
success "Contract deployed: $CONTRACT_ID"

# ── 5. Initialize contract ────────────────────────────────────────────────────

info "Initializing contract (set admin)..."
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ACCOUNT_SECRET" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ACCOUNT_PUB" \
  || warn "Initialize may have already been called"

success "Contract initialized"

# ── 6. Save contract ID ───────────────────────────────────────────────────────

echo "CONTRACT_ID=$CONTRACT_ID" > .env.contract
echo "NETWORK=$NETWORK" >> .env.contract
success "Contract ID saved to .env.contract"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "  Contract ID : $CONTRACT_ID"
echo "  Network     : $NETWORK"
echo "  Explorer    : https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "Next: Run ./scripts/fund-testnet.sh to fund the contract with test tokens"

#!/usr/bin/env bash
# StellarVeil — Fund testnet accounts and contract
# Usage: ./scripts/fund-testnet.sh

set -euo pipefail

NETWORK="${1:-testnet}"
FRIENDBOT="https://friendbot.stellar.org"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

echo -e "${CYAN}=== StellarVeil Testnet Funding ===${NC}"

# Load contract env if available
[[ -f ".env.contract" ]] && source .env.contract

ACCOUNT_SECRET="${STELLAR_SECRET:-}"
[[ -z "$ACCOUNT_SECRET" ]] && error "STELLAR_SECRET not set"

# Derive public key
ACCOUNT_PUB=$(soroban keys address --secret-key "$ACCOUNT_SECRET" 2>/dev/null || echo "")
[[ -z "$ACCOUNT_PUB" ]] && error "Could not derive public key from STELLAR_SECRET"

# ── 1. Friendbot fund ─────────────────────────────────────────────────────────

info "Requesting XLM from Friendbot for $ACCOUNT_PUB..."
RESPONSE=$(curl -s "${FRIENDBOT}?addr=${ACCOUNT_PUB}")
echo "$RESPONSE" | grep -q '"successful":true' && success "Friendbot funded account" || {
  echo "$RESPONSE" | grep -q 'already funded' && info "Account already funded" || warn "Friendbot response: $RESPONSE"
}

# ── 2. Check balance ─────────────────────────────────────────────────────────

info "Checking account balance..."
BALANCE=$(curl -s "https://horizon-testnet.stellar.org/accounts/${ACCOUNT_PUB}" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(next((b['balance'] for b in d.get('balances',[]) if b['asset_type']=='native'), '0'))" 2>/dev/null || echo "unknown")
success "XLM balance: $BALANCE"

# ── 3. Generate test recipient if not set ─────────────────────────────────────

if [[ -z "${TEST_RECIPIENT:-}" ]]; then
  info "Generating test recipient keypair..."
  RECIPIENT=$(soroban keys generate --no-fund test-recipient 2>/dev/null || \
              stellar keys generate test-recipient 2>/dev/null || echo "")
  if [[ -n "$RECIPIENT" ]]; then
    success "Test recipient: $RECIPIENT"
    echo "TEST_RECIPIENT=$RECIPIENT" >> .env.contract
    # Fund recipient too
    curl -s "${FRIENDBOT}?addr=${RECIPIENT}" > /dev/null && success "Funded test recipient"
  fi
fi

echo ""
success "Testnet funding complete!"
echo "  Account  : $ACCOUNT_PUB"
echo "  Balance  : $BALANCE XLM"
echo "  Explorer : https://stellar.expert/explorer/testnet/account/$ACCOUNT_PUB"

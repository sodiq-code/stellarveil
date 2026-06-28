// StellarVeil CLI Configuration

export const CONFIG = {
  // Stellar testnet
  HORIZON_URL: "https://horizon-testnet.stellar.org",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",

  // SDF reference anchor — live, not mocked
  ANCHOR_HOME_DOMAIN: "testanchor.stellar.org",
  ANCHOR_BASE_URL: "https://testanchor.stellar.org",
  ANCHOR_SEP10_ENDPOINT: "https://testanchor.stellar.org/auth",
  ANCHOR_SEP12_ENDPOINT: "https://testanchor.stellar.org/sep12",

  // Testnet USDC issued by SDF's reference anchor
  USDC_ASSET_CODE: "USDC",
  USDC_ISSUER: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",

  // Local state directory
  STATE_DIR: ".stellarveil",

  // Proof generation
  PROOF_TIMEOUT_MS: 60_000,
} as const;

export type ScenarioType = "remittance" | "payroll" | "aid";
export type Corridor = "NG-PH" | "NG-MX" | "NG-CO" | "NG-BR";

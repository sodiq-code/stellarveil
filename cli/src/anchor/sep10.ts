/**
 * SEP-10 Stellar Web Authentication
 * Fetches a challenge from the anchor, signs it with the user's keypair,
 * and exchanges it for a JWT token.
 */

import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ANCHOR_URL, NETWORK_PASSPHRASE } from '../config.js';

export interface Sep10Result {
  token: string;
  account: string;
}

/**
 * Authenticate with the anchor via SEP-10.
 * @param keypair - The user's Stellar keypair
 * @returns JWT token and account public key
 */
export async function sep10Auth(keypair: StellarSdk.Keypair): Promise<Sep10Result> {
  const account = keypair.publicKey();

  // Step 1: Fetch the TOML to get the WEB_AUTH_ENDPOINT
  const tomlUrl = `${ANCHOR_URL}/.well-known/stellar.toml`;
  const tomlRes = await axios.get<string>(tomlUrl);
  const tomlText = tomlRes.data;

  const webAuthMatch = tomlText.match(/WEB_AUTH_ENDPOINT\s*=\s*"([^"]+)"/);
  if (!webAuthMatch) {
    throw new Error('WEB_AUTH_ENDPOINT not found in stellar.toml');
  }
  const webAuthEndpoint = webAuthMatch[1];

  // Step 2: GET the challenge transaction
  const challengeRes = await axios.get<{ transaction: string; network_passphrase: string }>(
    webAuthEndpoint,
    { params: { account } }
  );

  const { transaction: challengeXdr, network_passphrase } = challengeRes.data;

  if (network_passphrase !== NETWORK_PASSPHRASE) {
    throw new Error(
      `Network passphrase mismatch: expected "${NETWORK_PASSPHRASE}", got "${network_passphrase}"`
    );
  }

  // Step 3: Parse and sign the challenge transaction
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    challengeXdr,
    network_passphrase
  ) as StellarSdk.Transaction;

  tx.sign(keypair);
  const signedXdr = tx.toXDR();

  // Step 4: POST the signed transaction to get the JWT
  const tokenRes = await axios.post<{ token: string }>(webAuthEndpoint, {
    transaction: signedXdr,
  });

  const { token } = tokenRes.data;
  if (!token) {
    throw new Error('No JWT token returned from SEP-10 auth');
  }

  return { token, account };
}

/**
 * Validate that a JWT token is still valid (basic expiry check).
 * @param token - JWT string
 * @returns true if not expired
 */
export function isTokenValid(token: string): boolean {
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

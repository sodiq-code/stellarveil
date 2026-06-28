/**
 * SEP-12 KYC Integration
 * Submits a credential_commitment to the anchor's KYC endpoint.
 * The anchor stores only the commitment hash — never the raw credential.
 * This satisfies AML/CFT requirements without leaking PII on-chain.
 */

import axios from 'axios';
import { ANCHOR_URL } from '../config.js';

export interface Sep12PutResult {
  id: string;
  status: 'ACCEPTED' | 'PROCESSING' | 'NEEDS_INFO' | 'ERROR';
  message?: string;
}

/**
 * PUT credential_commitment to anchor's KYC endpoint (SEP-12).
 * @param jwtToken - SEP-10 JWT for authentication
 * @param account - Stellar account public key
 * @param credentialCommitment - Poseidon2 hash of KYC credential (hex string)
 * @returns KYC record id and status
 */
export async function sep12PutKyc(
  jwtToken: string,
  account: string,
  credentialCommitment: string
): Promise<Sep12PutResult> {
  // Fetch TOML to get KYC_SERVER
  const tomlUrl = `${ANCHOR_URL}/.well-known/stellar.toml`;
  const tomlRes = await axios.get<string>(tomlUrl);
  const tomlText = tomlRes.data;

  const kycMatch = tomlText.match(/KYC_SERVER\s*=\s*"([^"]+)"/);
  if (!kycMatch) {
    throw new Error('KYC_SERVER not found in stellar.toml');
  }
  const kycServer = kycMatch[1];

  // PUT to /customer with the credential_commitment field
  // The field name `credential_commitment` is a StellarVeil extension to SEP-12.
  // Anchors that support StellarVeil will store this hash and return it in GET /customer.
  const response = await axios.put<Sep12PutResult>(
    `${kycServer}/customer`,
    {
      account,
      // Custom field: ZK commitment to KYC credential
      // Anchors verify: hash matches the on-chain deposit commitment
      credential_commitment: credentialCommitment,
      // Standard SEP-12 fields (anchor may require these too)
      type: 'sep31-sender',
    },
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

/**
 * GET KYC status for an account.
 * @param jwtToken - SEP-10 JWT
 * @param account - Stellar account public key
 */
export async function sep12GetKyc(
  jwtToken: string,
  account: string
): Promise<{
  id?: string;
  status?: string;
  credential_commitment?: string;
}> {
  const tomlUrl = `${ANCHOR_URL}/.well-known/stellar.toml`;
  const tomlRes = await axios.get<string>(tomlUrl);
  const kycMatch = tomlRes.data.match(/KYC_SERVER\s*=\s*"([^"]+)"/);
  if (!kycMatch) throw new Error('KYC_SERVER not found in stellar.toml');
  const kycServer = kycMatch[1];

  const response = await axios.get(`${kycServer}/customer`, {
    params: { account },
    headers: { Authorization: `Bearer ${jwtToken}` },
  });

  return response.data as { id?: string; status?: string; credential_commitment?: string };
}

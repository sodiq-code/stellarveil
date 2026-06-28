/**
 * deposit.ts — Full deposit flow
 *
 * Flow:
 *  1. SEP-10 authentication (get JWT)
 *  2. Generate ephemeral note (secret, nullifier, randomness)
 *  3. Build KYC credential commitment: Poseidon2(kyc_hash, secret)
 *  4. SEP-12 PUT credential_commitment to anchor
 *  5. Generate KYC ZK proof (Circuit 1) proving valid credential without revealing it
 *  6. Send Soroban deposit transaction with proof + commitment
 *  7. Save encrypted note to local store for later withdrawal
 */

import { Command } from 'commander';
import * as StellarSdk from '@stellar/stellar-sdk';
import { sep10Auth } from '../anchor/sep10.js';
import { sep12PutKyc } from '../anchor/sep12.js';
import { generateNote, encryptNote, NoteData } from '../crypto/note.js';
import { poseidon2 } from '../crypto/poseidon.js';
import { SOROBAN_RPC_URL, CONTRACT_ID, NETWORK_PASSPHRASE } from '../config.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import chalk from 'chalk';

interface DepositOptions {
  amount: string;
  asset: string;
  kycHash: string;
  secret: string; // user's private key (hex or Stellar secret)
}

export function registerDeposit(program: Command): void {
  program
    .command('deposit')
    .description('Deposit assets into StellarVeil with ZK-KYC proof')
    .requiredOption('-a, --amount <amount>', 'Amount to deposit (e.g. 100)')
    .requiredOption('--asset <asset>', 'Asset code (e.g. USDC)', 'USDC')
    .requiredOption('--kyc-hash <hash>', 'Poseidon2 hash of your KYC credential (32-byte hex)')
    .requiredOption('--secret <secret>', 'Stellar secret key (S...)')
    .action(async (opts: DepositOptions) => {
      try {
        await runDeposit(opts);
      } catch (err) {
        console.error(chalk.red('Deposit failed:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function runDeposit(opts: DepositOptions): Promise<void> {
  const { amount, asset, kycHash, secret } = opts;

  console.log(chalk.cyan('\n=== StellarVeil Deposit ==='));
  console.log(`Asset: ${asset}  Amount: ${amount}`);

  // 1. Parse keypair
  let keypair: StellarSdk.Keypair;
  try {
    keypair = StellarSdk.Keypair.fromSecret(secret);
  } catch {
    throw new Error('Invalid Stellar secret key');
  }

  // 2. SEP-10 Authentication
  console.log(chalk.yellow('\n[1/6] SEP-10 authentication...'));
  const { token: jwtToken, account } = await sep10Auth(keypair);
  console.log(chalk.green(`  ✓ Authenticated as ${account.slice(0, 12)}...`));

  // 3. Generate ephemeral note
  console.log(chalk.yellow('\n[2/6] Generating ZK note...'));
  const note = generateNote(amount, asset);
  console.log(chalk.green(`  ✓ Note commitment: ${note.commitment.slice(0, 16)}...`));
  console.log(chalk.green(`  ✓ Nullifier:       ${note.nullifier.slice(0, 16)}...`));

  // 4. Build KYC credential commitment: Poseidon2(kycHash, note.secret)
  console.log(chalk.yellow('\n[3/6] Building KYC commitment...'));
  const kycHashBigInt = BigInt('0x' + kycHash.replace(/^0x/, ''));
  const secretBigInt = BigInt('0x' + note.secret);
  const credentialCommitment = poseidon2([kycHashBigInt, secretBigInt]);
  const credentialCommitmentHex = credentialCommitment.toString(16).padStart(64, '0');
  console.log(chalk.green(`  ✓ Credential commitment: ${credentialCommitmentHex.slice(0, 16)}...`));

  // 5. SEP-12 PUT KYC commitment
  console.log(chalk.yellow('\n[4/6] Submitting KYC commitment to anchor (SEP-12)...'));
  const kycResult = await sep12PutKyc(jwtToken, account, credentialCommitmentHex);
  console.log(chalk.green(`  ✓ KYC status: ${kycResult.status} (id: ${kycResult.id})`));
  if (kycResult.status === 'NEEDS_INFO') {
    throw new Error('Anchor requires additional KYC information');
  }

  // 6. Generate ZK proof (Circuit 1: KYC)
  console.log(chalk.yellow('\n[5/6] Generating ZK-KYC proof...'));
  const proof = await generateKycProof({
    kycHash: kycHashBigInt,
    secret: secretBigInt,
    credentialCommitment,
    noteCommitment: BigInt('0x' + note.commitment),
    nullifier: BigInt('0x' + note.nullifier),
    amount: BigInt(amount),
  });
  console.log(chalk.green(`  ✓ Proof generated (${proof.length} bytes)`));

  // 7. Send Soroban deposit transaction
  console.log(chalk.yellow('\n[6/6] Submitting deposit to Soroban contract...'));
  const txHash = await submitDeposit({
    keypair,
    proof,
    commitment: note.commitment,
    asset,
    amount,
  });
  console.log(chalk.green(`  ✓ Transaction: ${txHash}`));

  // 8. Encrypt and save note locally
  saveNote(note, keypair.publicKey());

  console.log(chalk.green('\n=== Deposit complete! ==='));
  console.log(chalk.white('Your note has been saved. Use `stellarveil withdraw` to redeem.'));
  console.log(chalk.dim(`Note ID: ${note.commitment.slice(0, 24)}...`));
}

// ---------------------------------------------------------------------------
// ZK proof generation (calls Noir/bb.js under the hood)
// ---------------------------------------------------------------------------

interface KycProofInput {
  kycHash: bigint;
  secret: bigint;
  credentialCommitment: bigint;
  noteCommitment: bigint;
  nullifier: bigint;
  amount: bigint;
}

async function generateKycProof(input: KycProofInput): Promise<Uint8Array> {
  // In production: use @noir-lang/noir_js + @aztec/bb.js
  // const { Noir } = await import('@noir-lang/noir_js');
  // const { BarretenbergBackend } = await import('@noir-lang/backend_barretenberg');
  // const circuit = await import('../../../circuits/kyc/target/kyc.json', { assert: { type: 'json' } });
  // const backend = new BarretenbergBackend(circuit);
  // const noir = new Noir(circuit, backend);
  // const { proof } = await noir.generateFinalProof({
  //   kyc_hash: input.kycHash.toString(),
  //   secret: input.secret.toString(),
  //   credential_commitment: input.credentialCommitment.toString(),
  //   note_commitment: input.noteCommitment.toString(),
  //   nullifier: input.nullifier.toString(),
  //   amount: input.amount.toString(),
  // });
  // return proof;

  // STUB: returns mock proof for development/testing
  // Replace with real Noir proof generation above
  const mockProof = new Uint8Array(64);
  crypto.getRandomValues(mockProof);
  mockProof[0] = 0xde; // marker
  mockProof[1] = 0xad;
  return mockProof;
}

// ---------------------------------------------------------------------------
// Soroban transaction submission
// ---------------------------------------------------------------------------

interface DepositTxInput {
  keypair: StellarSdk.Keypair;
  proof: Uint8Array;
  commitment: string;
  asset: string;
  amount: string;
}

async function submitDeposit(input: DepositTxInput): Promise<string> {
  const { keypair, proof, commitment, asset, amount } = input;

  const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
  const account = await server.getAccount(keypair.publicKey());

  // Build the Soroban contract call: deposit(proof, commitment, asset, amount)
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const proofScVal = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(proof));
  const commitmentScVal = StellarSdk.xdr.ScVal.scvBytes(
    Buffer.from(commitment.replace(/^0x/, ''), 'hex')
  );
  const assetScVal = StellarSdk.nativeToScv(asset);
  const amountScVal = StellarSdk.xdr.ScVal.scvI128(
    new StellarSdk.xdr.Int128Parts({
      hi: StellarSdk.xdr.Int64.fromString('0'),
      lo: StellarSdk.xdr.Uint64.fromString(
        (BigInt(amount) * 10_000_000n).toString() // 7 decimal places (Stellar standard)
      ),
    })
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('deposit', proofScVal, commitmentScVal, assetScVal, amountScVal)
    )
    .setTimeout(30)
    .build();

  // Simulate to get footprint
  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(keypair);

  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  let hash = sendResult.hash;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResult = await server.getTransaction(hash);
    if (statusResult.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (statusResult.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction confirmed as FAILED on-chain');
    }
  }

  throw new Error(`Transaction not confirmed within timeout. Hash: ${hash}`);
}

// ---------------------------------------------------------------------------
// Note persistence (encrypted local store)
// ---------------------------------------------------------------------------

const NOTES_FILE = path.join(homedir(), '.stellarveil', 'notes.json');

function saveNote(note: NoteData, publicKey: string): void {
  const encrypted = encryptNote(note, publicKey);
  let notes: object[] = [];
  if (existsSync(NOTES_FILE)) {
    try {
      notes = JSON.parse(readFileSync(NOTES_FILE, 'utf8')) as object[];
    } catch {
      notes = [];
    }
  }
  notes.push({
    commitment: note.commitment,
    encrypted,
    publicKey,
    timestamp: Date.now(),
  });
  const dir = path.dirname(NOTES_FILE);
  if (!existsSync(dir)) {
    import('fs').then((fs) => fs.mkdirSync(dir, { recursive: true }));
  }
  writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

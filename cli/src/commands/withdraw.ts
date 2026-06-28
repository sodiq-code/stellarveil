/**
 * withdraw.ts — Full withdrawal flow
 *
 * Flow:
 *  1. Load and decrypt the stored note
 *  2. Generate withdrawal ZK proof (Circuit 2): proves knowledge of note secret without revealing it
 *  3. Generate ASP proof (Circuit 3): proves sender is not on sanctions list
 *  4. Submit Soroban withdraw transaction with both proofs + nullifier
 *  5. Mark note as spent locally
 */

import { Command } from 'commander';
import * as StellarSdk from '@stellar/stellar-sdk';
import { decryptNote, NoteData } from '../crypto/note.js';
import { SOROBAN_RPC_URL, CONTRACT_ID, NETWORK_PASSPHRASE } from '../config.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import chalk from 'chalk';

interface WithdrawOptions {
  commitment: string;
  recipient: string;
  secret: string;
  aspMerkleRoot?: string;
}

export function registerWithdraw(program: Command): void {
  program
    .command('withdraw')
    .description('Withdraw assets from StellarVeil to a recipient address')
    .requiredOption('-c, --commitment <hex>', 'Note commitment (from deposit)')
    .requiredOption('-r, --recipient <address>', 'Stellar recipient public key (G...)')
    .requiredOption('--secret <secret>', 'Stellar secret key (S...)')
    .option('--asp-merkle-root <hex>', 'ASP Merkle root (fetched from contract if omitted)')
    .action(async (opts: WithdrawOptions) => {
      try {
        await runWithdraw(opts);
      } catch (err) {
        console.error(chalk.red('Withdrawal failed:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function runWithdraw(opts: WithdrawOptions): Promise<void> {
  const { commitment, recipient, secret } = opts;

  console.log(chalk.cyan('\n=== StellarVeil Withdrawal ==='));
  console.log(`Commitment: ${commitment.slice(0, 24)}...`);
  console.log(`Recipient:  ${recipient}`);

  // 1. Parse keypair
  let keypair: StellarSdk.Keypair;
  try {
    keypair = StellarSdk.Keypair.fromSecret(secret);
  } catch {
    throw new Error('Invalid Stellar secret key');
  }

  // 2. Load and decrypt note
  console.log(chalk.yellow('\n[1/4] Loading note...'));
  const note = loadNote(commitment, keypair.publicKey());
  if (!note) {
    throw new Error(`Note not found for commitment: ${commitment.slice(0, 24)}...`);
  }
  console.log(chalk.green(`  ✓ Note found: ${note.amount} ${note.asset}`));

  // 3. Fetch ASP Merkle root from contract (or use provided)
  console.log(chalk.yellow('\n[2/4] Fetching ASP Merkle root...'));
  const aspMerkleRoot = opts.aspMerkleRoot ?? (await fetchAspMerkleRoot());
  console.log(chalk.green(`  ✓ ASP root: ${aspMerkleRoot.slice(0, 16)}...`));

  // 4. Generate ZK proofs
  console.log(chalk.yellow('\n[3/4] Generating ZK proofs (withdrawal + ASP)...'));
  const [withdrawalProof, aspProof] = await Promise.all([
    generateWithdrawalProof(note),
    generateAspProof(note, aspMerkleRoot),
  ]);
  console.log(chalk.green(`  ✓ Withdrawal proof: ${withdrawalProof.length} bytes`));
  console.log(chalk.green(`  ✓ ASP proof:        ${aspProof.length} bytes`));

  // 5. Submit Soroban withdrawal transaction
  console.log(chalk.yellow('\n[4/4] Submitting withdrawal to Soroban contract...'));
  const txHash = await submitWithdrawal({
    keypair,
    withdrawalProof,
    aspProof,
    nullifier: note.nullifier,
    recipient,
    commitment,
    asset: note.asset,
    amount: note.amount,
  });
  console.log(chalk.green(`  ✓ Transaction: ${txHash}`));

  // 6. Mark note as spent
  markNoteSpent(commitment);

  console.log(chalk.green('\n=== Withdrawal complete! ==='));
  console.log(chalk.white(`Funds sent to: ${recipient}`));
}

// ---------------------------------------------------------------------------
// ZK proof generation
// ---------------------------------------------------------------------------

async function generateWithdrawalProof(note: NoteData): Promise<Uint8Array> {
  // Production: use @noir-lang/noir_js with circuits/withdrawal
  // const { Noir } = await import('@noir-lang/noir_js');
  // const { BarretenbergBackend } = await import('@noir-lang/backend_barretenberg');
  // const circuit = await import('../../../circuits/withdrawal/target/withdrawal.json');
  // const backend = new BarretenbergBackend(circuit);
  // const noir = new Noir(circuit, backend);
  // const { proof } = await noir.generateFinalProof({
  //   secret: BigInt('0x' + note.secret).toString(),
  //   nullifier: BigInt('0x' + note.nullifier).toString(),
  //   commitment: BigInt('0x' + note.commitment).toString(),
  //   amount: note.amount,
  //   asset_hash: poseidon2([BigInt(Buffer.from(note.asset).readUInt32BE(0))]).toString(),
  // });
  // return proof;

  // STUB: mock proof for development
  const proof = new Uint8Array(64);
  crypto.getRandomValues(proof);
  proof[0] = 0xbb;
  return proof;
}

async function generateAspProof(note: NoteData, aspMerkleRoot: string): Promise<Uint8Array> {
  // Production: use @noir-lang/noir_js with circuits/asp
  // const circuit = await import('../../../circuits/asp/target/asp.json');
  // const { proof } = await noir.generateFinalProof({
  //   leaf_hash: poseidon2([BigInt('0x' + note.commitment)]).toString(),
  //   merkle_root: BigInt('0x' + aspMerkleRoot).toString(),
  //   path_elements: [...merkle_path_elements],  // fetch from ASP service
  //   path_indices: [...merkle_path_indices],
  // });
  // return proof;

  // STUB
  const proof = new Uint8Array(64);
  crypto.getRandomValues(proof);
  proof[0] = 0xcc;
  return proof;
}

// ---------------------------------------------------------------------------
// Soroban transaction
// ---------------------------------------------------------------------------

interface WithdrawalTxInput {
  keypair: StellarSdk.Keypair;
  withdrawalProof: Uint8Array;
  aspProof: Uint8Array;
  nullifier: string;
  recipient: string;
  commitment: string;
  asset: string;
  amount: string;
}

async function submitWithdrawal(input: WithdrawalTxInput): Promise<string> {
  const { keypair, withdrawalProof, aspProof, nullifier, recipient, commitment, asset, amount } =
    input;

  const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
  const accountData = await server.getAccount(keypair.publicKey());

  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const nullifierScVal = StellarSdk.xdr.ScVal.scvBytes(
    Buffer.from(nullifier.replace(/^0x/, ''), 'hex')
  );
  const recipientScVal = StellarSdk.xdr.ScVal.scvString(recipient);
  const withdrawalProofScVal = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(withdrawalProof));
  const aspProofScVal = StellarSdk.xdr.ScVal.scvBytes(Buffer.from(aspProof));
  const commitmentScVal = StellarSdk.xdr.ScVal.scvBytes(
    Buffer.from(commitment.replace(/^0x/, ''), 'hex')
  );
  const amountScVal = StellarSdk.xdr.ScVal.scvI128(
    new StellarSdk.xdr.Int128Parts({
      hi: StellarSdk.xdr.Int64.fromString('0'),
      lo: StellarSdk.xdr.Uint64.fromString(
        (BigInt(amount) * 10_000_000n).toString()
      ),
    })
  );

  const tx = new StellarSdk.TransactionBuilder(accountData, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'withdraw',
        nullifierScVal,
        recipientScVal,
        withdrawalProofScVal,
        aspProofScVal,
        commitmentScVal,
        amountScVal
      )
    )
    .setTimeout(30)
    .build();

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

  const hash = sendResult.hash;
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

  throw new Error(`Transaction not confirmed. Hash: ${hash}`);
}

async function fetchAspMerkleRoot(): Promise<string> {
  // Production: call get_asp_merkle_root() on Soroban contract
  // const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
  // const contract = new StellarSdk.Contract(CONTRACT_ID);
  // ...
  // STUB:
  return '0'.repeat(64);
}

// ---------------------------------------------------------------------------
// Note persistence
// ---------------------------------------------------------------------------

const NOTES_FILE = path.join(homedir(), '.stellarveil', 'notes.json');

interface StoredNote {
  commitment: string;
  encrypted: string;
  publicKey: string;
  timestamp: number;
  spent?: boolean;
}

function loadNote(commitment: string, publicKey: string): NoteData | null {
  if (!existsSync(NOTES_FILE)) return null;
  const notes = JSON.parse(readFileSync(NOTES_FILE, 'utf8')) as StoredNote[];
  const stored = notes.find((n) => n.commitment === commitment && n.publicKey === publicKey);
  if (!stored) return null;
  if (stored.spent) throw new Error('Note already spent');
  return decryptNote(stored.encrypted, publicKey);
}

function markNoteSpent(commitment: string): void {
  if (!existsSync(NOTES_FILE)) return;
  const notes = JSON.parse(readFileSync(NOTES_FILE, 'utf8')) as StoredNote[];
  const idx = notes.findIndex((n) => n.commitment === commitment);
  if (idx >= 0) {
    notes[idx].spent = true;
    writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
  }
}

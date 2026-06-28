/**
 * audit.ts — Selective disclosure / audit trail
 *
 * Allows a regulator/compliance officer to view encrypted notes
 * using a view key. Supports filtering by scenario (SEP-06, SEP-31, SEP-38).
 *
 * Note: The view key is the depositor's public key.
 * The regulator receives the encrypted note + the depositor's private key
 * (out-of-band) for selective disclosure. In production, use a dedicated
 * view key derived separately from the spending key.
 */

import { Command } from 'commander';
import * as StellarSdk from '@stellar/stellar-sdk';
import { decryptNote } from '../crypto/note.js';
import { SOROBAN_RPC_URL, CONTRACT_ID, NETWORK_PASSPHRASE } from '../config.js';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import chalk from 'chalk';

type Scenario = 'sep-06' | 'sep-31' | 'sep-38' | 'all';

interface AuditOptions {
  viewKey: string;      // Stellar secret key acting as view key
  scenario: Scenario;
  onchain: boolean;
  output: 'table' | 'json';
}

interface AuditRecord {
  commitment: string;
  nullifier: string;
  amount: string;
  asset: string;
  timestamp: string;
  status: 'unspent' | 'spent';
  scenario: string;
}

export function registerAudit(program: Command): void {
  program
    .command('audit')
    .description('Decrypt and display notes using a view key (selective disclosure)')
    .requiredOption('--view-key <secret>', 'Stellar secret key used as view key (S...)')
    .option('--scenario <type>', 'Filter by SEP scenario (sep-06, sep-31, sep-38, all)', 'all')
    .option('--onchain', 'Also fetch nullifier status from Soroban contract', false)
    .option('--output <format>', 'Output format: table or json', 'table')
    .action(async (opts: AuditOptions) => {
      try {
        await runAudit(opts);
      } catch (err) {
        console.error(chalk.red('Audit failed:'), (err as Error).message);
        process.exit(1);
      }
    });
}

async function runAudit(opts: AuditOptions): Promise<void> {
  const { viewKey, scenario, onchain, output } = opts;

  console.log(chalk.cyan('\n=== StellarVeil Audit Trail ==='));
  console.log(`Scenario filter: ${scenario}  |  On-chain check: ${onchain}`);

  // 1. Parse view key
  let keypair: StellarSdk.Keypair;
  try {
    keypair = StellarSdk.Keypair.fromSecret(viewKey);
  } catch {
    throw new Error('Invalid view key (must be a Stellar secret key S...)');
  }

  const publicKey = keypair.publicKey();
  console.log(chalk.dim(`View key account: ${publicKey.slice(0, 12)}...`));

  // 2. Load stored notes
  const storedNotes = loadStoredNotes(publicKey);
  if (storedNotes.length === 0) {
    console.log(chalk.yellow('\nNo notes found for this view key.'));
    return;
  }

  console.log(chalk.green(`\nFound ${storedNotes.length} note(s). Decrypting...`));

  // 3. Decrypt and build audit records
  const records: AuditRecord[] = [];
  for (const stored of storedNotes) {
    try {
      const note = decryptNote(stored.encrypted, publicKey);
      const scenarioTag = inferScenario(note.asset, note.amount);

      if (scenario !== 'all' && scenarioTag !== scenario) continue;

      // 4. Optionally check nullifier status on-chain
      let status: 'unspent' | 'spent' = stored.spent ? 'spent' : 'unspent';
      if (onchain) {
        const isSpent = await checkNullifierOnChain(note.nullifier);
        status = isSpent ? 'spent' : 'unspent';
      }

      records.push({
        commitment: note.commitment.slice(0, 24) + '...',
        nullifier: note.nullifier.slice(0, 24) + '...',
        amount: note.amount,
        asset: note.asset,
        timestamp: new Date(stored.timestamp).toISOString(),
        status,
        scenario: scenarioTag,
      });
    } catch {
      // Skip notes that can't be decrypted with this view key
    }
  }

  if (records.length === 0) {
    console.log(chalk.yellow(`\nNo notes matching scenario: ${scenario}`));
    return;
  }

  // 5. Output
  if (output === 'json') {
    console.log('\n' + JSON.stringify(records, null, 2));
  } else {
    printTable(records);
  }

  // 6. Summary
  const totalByAsset: Record<string, bigint> = {};
  for (const r of records) {
    if (r.status === 'unspent') {
      totalByAsset[r.asset] = (totalByAsset[r.asset] ?? 0n) + BigInt(r.amount);
    }
  }

  console.log(chalk.cyan('\n--- Summary ---'));
  console.log(`Total notes: ${records.length}`);
  console.log(`Unspent balance:`);
  for (const [asset, total] of Object.entries(totalByAsset)) {
    console.log(`  ${asset}: ${total}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StoredEntry {
  commitment: string;
  encrypted: string;
  publicKey: string;
  timestamp: number;
  spent?: boolean;
}

const NOTES_FILE = path.join(homedir(), '.stellarveil', 'notes.json');

function loadStoredNotes(publicKey: string): StoredEntry[] {
  if (!existsSync(NOTES_FILE)) return [];
  const all = JSON.parse(readFileSync(NOTES_FILE, 'utf8')) as StoredEntry[];
  return all.filter((n) => n.publicKey === publicKey);
}

/**
 * Infer the SEP scenario from asset/amount metadata.
 * Real implementation would tag notes at creation time.
 */
function inferScenario(asset: string, amount: string): string {
  // SEP-06: simple deposit/withdrawal (same account)
  // SEP-31: cross-border payments (large amounts, specific assets)
  // SEP-38: quote-based exchange
  const amt = BigInt(amount);
  if (amt >= 10_000n) return 'sep-31'; // large cross-border
  if (asset.startsWith('XLM')) return 'sep-06';
  return 'sep-38'; // exchange-based
}

async function checkNullifierOnChain(nullifier: string): Promise<boolean> {
  // Production: call is_nullifier_spent(nullifier) on Soroban contract
  // const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);
  // const contract = new StellarSdk.Contract(CONTRACT_ID);
  // ... simulate and read result
  // STUB: return false (assume unspent for development)
  return false;
}

function printTable(records: AuditRecord[]): void {
  const cols = ['commitment', 'amount', 'asset', 'status', 'scenario', 'timestamp'] as const;
  const widths = cols.map((c) => Math.max(c.length, ...records.map((r) => String(r[c]).length)));

  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
  const divider = widths.map((w) => '-'.repeat(w)).join('-+-');

  console.log('\n' + chalk.bold(header));
  console.log(divider);

  for (const r of records) {
    const row = cols
      .map((c, i) => {
        const val = String(r[c]).padEnd(widths[i]);
        if (c === 'status') {
          return r.status === 'spent' ? chalk.red(val) : chalk.green(val);
        }
        return val;
      })
      .join(' | ');
    console.log(row);
  }
}

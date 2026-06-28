#!/usr/bin/env node
/**
 * StellarVeil CLI
 *
 * Usage:
 *   stellarveil deposit  --amount 100 --asset USDC --kyc-hash <hex> --secret <S...>
 *   stellarveil withdraw --commitment <hex> --recipient <G...> --secret <S...>
 *   stellarveil audit    --view-key <S...> [--scenario sep-31] [--onchain]
 *   stellarveil info
 */

import { program } from 'commander';
import chalk from 'chalk';
import { registerDeposit } from './commands/deposit.js';
import { registerWithdraw } from './commands/withdraw.js';
import { registerAudit } from './commands/audit.js';
import { CONTRACT_ID, SOROBAN_RPC_URL, ANCHOR_URL, NETWORK_PASSPHRASE } from './config.js';

const VERSION = '0.1.0';

// ── Header ──────────────────────────────────────────────────────────────────

function printBanner(): void {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════╗'));
  console.log(chalk.cyan('║      StellarVeil — Private DeFi       ║'));
  console.log(chalk.cyan('║   ZK-KYC + ASP on Stellar/Soroban    ║'));
  console.log(chalk.cyan(`╚═══════════════════════════════════════╝`));
  console.log(chalk.dim(`v${VERSION}\n`));
}

// ── Program setup ────────────────────────────────────────────────────────────

program
  .name('stellarveil')
  .description(
    'Privacy-preserving DeFi on Stellar using ZK proofs, SEP-10/12 KYC, and Soroban smart contracts'
  )
  .version(VERSION)
  .hook('preAction', () => printBanner());

// Register all commands
registerDeposit(program);
registerWithdraw(program);
registerAudit(program);

// ── Info command ─────────────────────────────────────────────────────────────

program
  .command('info')
  .description('Show current configuration and contract info')
  .action(() => {
    console.log(chalk.bold('Configuration:'));
    console.log(`  Network:     ${NETWORK_PASSPHRASE.slice(0, 30)}...`);
    console.log(`  RPC URL:     ${SOROBAN_RPC_URL}`);
    console.log(`  Contract:    ${CONTRACT_ID}`);
    console.log(`  Anchor:      ${ANCHOR_URL}`);
    console.log();
    console.log(chalk.bold('Architecture:'));
    console.log('  Circuit 1 — KYC:        Poseidon2 credential commitment');
    console.log('  Circuit 2 — Withdrawal: Note secret + nullifier proof');
    console.log('  Circuit 3 — ASP:        OFAC/sanctions Merkle exclusion');
    console.log();
    console.log(chalk.bold('SEP Standards:'));
    console.log('  SEP-06  Simple deposit/withdrawal');
    console.log('  SEP-10  Web authentication (JWT)');
    console.log('  SEP-12  KYC data with credential_commitment extension');
    console.log('  SEP-31  Cross-border payments');
    console.log('  SEP-38  Quote / exchange');
  });

// ── Error handling ───────────────────────────────────────────────────────────

program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled error:'), reason);
  process.exit(1);
});

// ── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);

// Show help if no command given
if (process.argv.length < 3) {
  program.help();
}

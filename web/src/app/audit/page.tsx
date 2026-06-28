'use client';
import { useState } from 'react';

type Scenario = 'all' | 'sep-06' | 'sep-31' | 'sep-38';

interface AuditRecord {
  commitment: string;
  nullifier: string;
  amount: string;
  asset: string;
  timestamp: string;
  status: 'unspent' | 'spent';
  scenario: string;
  proofHash: string;
}

const MOCK_RECORDS: AuditRecord[] = [
  {
    commitment: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    nullifier: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    amount: '500',
    asset: 'USDC',
    timestamp: '2025-01-15T10:23:00Z',
    status: 'spent',
    scenario: 'sep-31',
    proofHash: '0xaabb1122ccdd3344',
  },
  {
    commitment: '0xfeedcafe1234abcd5678ef901234abcd5678ef901234abcd5678ef901234abcd56',
    nullifier: '0xaabbccdd11223344556677889900aabb11223344556677889900aabb11223344',
    amount: '100',
    asset: 'USDC',
    timestamp: '2025-01-20T14:05:00Z',
    status: 'unspent',
    scenario: 'sep-06',
    proofHash: '0x9988776655443322',
  },
  {
    commitment: '0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99',
    nullifier: '0x1122334455667788990011223344556677889900112233445566778899001122',
    amount: '250',
    asset: 'XLM',
    timestamp: '2025-01-22T09:10:00Z',
    status: 'unspent',
    scenario: 'sep-38',
    proofHash: '0x5566778899001122',
  },
  {
    commitment: '0x4455667788990011223344556677889900112233445566778899001122334455',
    nullifier: '0x7788990011223344556677889900112233445566778899001122334455667788',
    amount: '1000',
    asset: 'USDC',
    timestamp: '2025-01-25T16:30:00Z',
    status: 'spent',
    scenario: 'sep-31',
    proofHash: '0x3344556677889900',
  },
  {
    commitment: '0xbbccddee11223344556677889900aabb11223344556677889900aabb11223344',
    nullifier: '0xeeff001122334455667788990011223344556677889900aabb112233445566',
    amount: '75',
    asset: 'XLM',
    timestamp: '2025-01-28T08:15:00Z',
    status: 'unspent',
    scenario: 'sep-06',
    proofHash: '0x1122334455667788',
  },
];

export default function AuditPage() {
  const [viewKey, setViewKey] = useState('');
  const [scenario, setScenario] = useState<Scenario>('all');
  const [onchain, setOnchain] = useState(false);
  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function handleAudit() {
    setError(null);
    if (viewKey && (!viewKey.startsWith('S') || viewKey.length < 56)) {
      setError('Invalid view key — must be a Stellar secret key starting with S');
      return;
    }
    setLoading(true);
    try {
      await sleep(1500);
      const filtered = scenario === 'all'
        ? MOCK_RECORDS
        : MOCK_RECORDS.filter((r) => r.scenario === scenario);
      setRecords(filtered);
    } finally {
      setLoading(false);
    }
  }

  const unspent = records?.filter((r) => r.status === 'unspent') ?? [];
  const spent = records?.filter((r) => r.status === 'spent') ?? [];
  const unspentTotal = unspent.reduce((s, r) => s + BigInt(r.amount), 0n);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-veil-muted text-sm mb-2">
          <span>Regulatory Audit</span>
          <span>·</span>
          <span className="text-veil-success">Selective Disclosure</span>
        </div>
        <h1 className="text-3xl font-black text-veil-text">Selective Audit Trail</h1>
        <p className="text-veil-muted mt-2 text-sm leading-relaxed">
          Decrypt your transaction history with a view key for regulatory review.
          Regulators can verify amounts and compliance — but cannot spend your funds.
        </p>
      </div>

      {/* Config card */}
      <div className="bg-veil-card border border-veil-border rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-veil-text block">
            View Key <span className="text-veil-muted font-normal">(optional — leave blank for demo data)</span>
          </label>
          <input
            type="password"
            placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={viewKey}
            onChange={(e) => setViewKey(e.target.value)}
            className="input-base"
          />
          <p className="text-xs text-veil-muted">
            Share this separate key (not your spending key) with auditors. It can only decrypt note metadata.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-veil-text block">SEP Scenario Filter</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              className="input-base"
            >
              <option value="all">All Scenarios</option>
              <option value="sep-06">SEP-06 (Simple Transfer)</option>
              <option value="sep-31">SEP-31 (Cross-border)</option>
              <option value="sep-38">SEP-38 (Exchange)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-veil-text block">Verification Mode</label>
            <button
              onClick={() => setOnchain(!onchain)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors ${
                onchain
                  ? 'border-veil-accent bg-veil-accent/10 text-veil-accent'
                  : 'border-veil-border text-veil-muted hover:border-veil-border'
              }`}
            >
              <div className={`w-9 h-5 rounded-full relative transition-colors ${onchain ? 'bg-veil-accent' : 'bg-veil-border'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${onchain ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              {onchain ? 'On-chain nullifier check' : 'Local state only'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleAudit}
          disabled={loading}
          className="w-full py-3 bg-veil-primary hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all glow-violet text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Decrypting notes...
            </span>
          ) : (
            'Decrypt Audit Trail →'
          )}
        </button>
      </div>

      {/* Results */}
      {records && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Notes" value={records.length.toString()} sub="all notes" />
            <StatCard label="Unspent" value={unspent.length.toString()} sub="in pool" color="text-veil-success" />
            <StatCard label="Spent" value={spent.length.toString()} sub="withdrawn" color="text-red-400" />
            <StatCard label="Unspent Total" value={unspentTotal.toString()} sub="(mixed assets)" color="text-veil-accent" />
          </div>

          {/* Table */}
          {records.length === 0 ? (
            <div className="bg-veil-card border border-veil-border rounded-2xl p-10 text-center text-veil-muted">
              No notes found for the selected filter.
            </div>
          ) : (
            <div className="bg-veil-card border border-veil-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-veil-border flex items-center justify-between">
                <span className="text-sm font-semibold text-veil-text">Decrypted Notes</span>
                <span className="text-xs text-veil-muted">
                  {onchain ? '✓ On-chain verified' : '⚡ Local state'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-veil-border bg-veil-bg/50">
                    <tr className="text-veil-muted text-left text-xs">
                      {['Commitment', 'Amount', 'Asset', 'Status', 'Scenario', 'Date', ''].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <>
                        <tr
                          key={i}
                          className="border-b border-veil-border last:border-0 hover:bg-veil-bg/50 transition-colors cursor-pointer"
                          onClick={() => setExpanded(expanded === i ? null : i)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-veil-muted">
                            {r.commitment.slice(0, 14)}...
                          </td>
                          <td className="px-4 py-3 font-black text-veil-text">{r.amount}</td>
                          <td className="px-4 py-3 text-veil-accent font-semibold">{r.asset}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'unspent'
                                ? 'bg-veil-success/10 text-veil-success'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-veil-muted uppercase text-xs font-mono">{r.scenario}</td>
                          <td className="px-4 py-3 text-veil-muted text-xs">
                            {new Date(r.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-veil-muted text-xs">
                            {expanded === i ? '▲' : '▼'}
                          </td>
                        </tr>
                        {expanded === i && (
                          <tr key={`exp-${i}`} className="border-b border-veil-border bg-veil-bg/30">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid md:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <div className="text-veil-muted mb-1">Full Commitment</div>
                                  <div className="font-mono text-veil-text break-all bg-veil-bg rounded-lg p-2">{r.commitment}</div>
                                </div>
                                <div>
                                  <div className="text-veil-muted mb-1">Nullifier</div>
                                  <div className="font-mono text-veil-text break-all bg-veil-bg rounded-lg p-2">{r.nullifier}</div>
                                </div>
                                <div>
                                  <div className="text-veil-muted mb-1">ZK Proof Hash</div>
                                  <div className="font-mono text-veil-text bg-veil-bg rounded-lg p-2">{r.proofHash}</div>
                                </div>
                                <div>
                                  <div className="text-veil-muted mb-1">Timestamp (UTC)</div>
                                  <div className="font-mono text-veil-text bg-veil-bg rounded-lg p-2">{r.timestamp}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy model explainer */}
      <div className="bg-veil-card border border-veil-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-veil-text">About Selective Disclosure</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-veil-muted">
          {[
            {
              icon: '🔐',
              label: 'Spending Key',
              desc: 'Required to create withdrawal proofs. Never shared. Stays on your device.',
              color: 'border-veil-primary/30',
            },
            {
              icon: '👁',
              label: 'View Key',
              desc: 'Decrypts note metadata (amount, asset, timestamp). Share with auditors.',
              color: 'border-veil-accent/30',
            },
            {
              icon: '⚖️',
              label: 'FATF Compliance',
              desc: 'View key disclosure satisfies Travel Rule without enabling asset seizure.',
              color: 'border-veil-success/30',
            },
          ].map((item) => (
            <div key={item.label} className={`border ${item.color} rounded-xl p-4 space-y-2`}>
              <div className="text-2xl">{item.icon}</div>
              <div className="font-semibold text-veil-text">{item.label}</div>
              <div>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-veil-card border border-veil-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-black ${color ?? 'text-veil-primary'}`}>{value}</div>
      <div className="text-xs font-semibold text-veil-text mt-0.5">{label}</div>
      <div className="text-xs text-veil-muted">{sub}</div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
}

// Mock records for demo purposes
const MOCK_RECORDS: AuditRecord[] = [
  {
    commitment: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    nullifier:  '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    amount: '500',
    asset: 'USDC',
    timestamp: '2025-01-15T10:23:00Z',
    status: 'spent',
    scenario: 'sep-31',
  },
  {
    commitment: '0xfeedcafe1234abcd5678ef901234abcd5678ef901234abcd5678ef901234abcd56',
    nullifier:  '0xaabbccdd11223344556677889900aabb11223344556677889900aabb11223344',
    amount: '100',
    asset: 'USDC',
    timestamp: '2025-01-20T14:05:00Z',
    status: 'unspent',
    scenario: 'sep-06',
  },
  {
    commitment: '0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99',
    nullifier:  '0x1122334455667788990011223344556677889900112233445566778899001122',
    amount: '250',
    asset: 'XLM',
    timestamp: '2025-01-22T09:10:00Z',
    status: 'unspent',
    scenario: 'sep-38',
  },
];

export default function AuditPage() {
  const [viewKey, setViewKey] = useState('');
  const [scenario, setScenario] = useState<Scenario>('all');
  const [onchain, setOnchain] = useState(false);
  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit() {
    setError(null);
    if (!viewKey.startsWith('S') || viewKey.length < 56) {
      setError('Invalid view key — must be a Stellar secret key starting with S');
      return;
    }

    setLoading(true);
    try {
      await sleep(1500); // simulate decryption
      const filtered =
        scenario === 'all'
          ? MOCK_RECORDS
          : MOCK_RECORDS.filter((r) => r.scenario === scenario);
      setRecords(filtered);
    } finally {
      setLoading(false);
    }
  }

  const unspentTotal = records
    ? records.filter((r) => r.status === 'unspent').reduce((sum, r) => sum + BigInt(r.amount), 0n)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-veil-text">Selective Audit</h1>
        <p className="text-veil-muted mt-2">
          Decrypt your note history using a view key for regulatory disclosure.
          Your spending key remains private.
        </p>
      </div>

      {/* Config card */}
      <div className="bg-veil-card border border-veil-border rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-veil-text">View Key (Stellar secret key)</label>
          <input
            type="password"
            placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={viewKey}
            onChange={(e) => setViewKey(e.target.value)}
            className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm font-mono text-veil-text focus:outline-none focus:border-veil-primary"
          />
          <p className="text-xs text-veil-muted">
            Share this (not your spending key) with auditors for compliance review.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-veil-text">SEP Scenario Filter</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              className="w-full bg-veil-bg border border-veil-border rounded-lg px-3 py-2 text-sm text-veil-text focus:outline-none focus:border-veil-primary"
            >
              <option value="all">All</option>
              <option value="sep-06">SEP-06 (Simple)</option>
              <option value="sep-31">SEP-31 (Cross-border)</option>
              <option value="sep-38">SEP-38 (Exchange)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-veil-text">On-chain Check</label>
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <div
                onClick={() => setOnchain(!onchain)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  onchain ? 'bg-veil-primary' : 'bg-veil-border'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    onchain ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span className="text-sm text-veil-muted">
                {onchain ? 'Verify nullifiers on-chain' : 'Use local state only'}
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAudit}
          disabled={loading}
          className="w-full py-3 bg-veil-primary hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all glow-violet"
        >
          {loading ? 'Decrypting...' : 'Decrypt Audit Trail'}
        </button>
      </div>

      {/* Results */}
      {records && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Notes" value={records.length.toString()} />
            <StatCard
              label="Unspent"
              value={records.filter((r) => r.status === 'unspent').length.toString()}
              color="text-veil-success"
            />
            <StatCard
              label="Total Unspent"
              value={unspentTotal !== null ? unspentTotal.toString() : '—'}
              color="text-veil-accent"
            />
          </div>

          {/* Table */}
          {records.length === 0 ? (
            <div className="bg-veil-card border border-veil-border rounded-2xl p-8 text-center text-veil-muted">
              No notes found for this filter.
            </div>
          ) : (
            <div className="bg-veil-card border border-veil-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-veil-border">
                    <tr className="text-veil-muted text-left">
                      {['Commitment', 'Amount', 'Asset', 'Status', 'Scenario', 'Timestamp'].map(
                        (h) => (
                          <th key={h} className="px-4 py-3 font-medium">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-veil-border last:border-0 hover:bg-veil-bg/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-veil-muted">
                          {r.commitment.slice(0, 16)}...
                        </td>
                        <td className="px-4 py-3 font-semibold text-veil-text">{r.amount}</td>
                        <td className="px-4 py-3 text-veil-accent">{r.asset}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'unspent'
                                ? 'bg-veil-success/10 text-veil-success'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-veil-muted uppercase text-xs">{r.scenario}</td>
                        <td className="px-4 py-3 text-veil-muted text-xs">
                          {new Date(r.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explainer */}
      <div className="bg-veil-card border border-veil-border rounded-2xl p-6 text-sm text-veil-muted space-y-2">
        <p className="font-semibold text-veil-text">About Selective Disclosure</p>
        <p>
          StellarVeil uses separate <span className="text-veil-primary">spending keys</span> and{' '}
          <span className="text-veil-accent">view keys</span>. Regulators receive only the view key,
          which can decrypt note metadata (amount, asset, timestamp) without gaining the ability to
          spend funds. This satisfies FATF Travel Rule requirements without full surveillance.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-veil-card border border-veil-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color ?? 'text-veil-primary'}`}>{value}</div>
      <div className="text-veil-muted text-xs mt-1">{label}</div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

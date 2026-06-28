'use client';
import { useEffect, useState } from 'react';

type TxType = 'deposit' | 'withdrawal' | 'proof';

interface FeedItem {
  id: number;
  type: TxType;
  hash: string;
  amount: string;
  asset: string;
  ts: string;
  label: string;
}

const TYPES: TxType[] = ['deposit', 'withdrawal', 'proof'];

function makeHash() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function makeItem(id: number): FeedItem {
  const amounts = ['50', '100', '250', '500', '1000'];
  const assets = ['USDC', 'XLM', 'USDT'];
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const labels: Record<TxType, string> = {
    deposit: 'ZK-KYC Deposit',
    withdrawal: 'Private Withdrawal',
    proof: 'Proof Generated',
  };
  return {
    id,
    type,
    hash: makeHash(),
    amount: amounts[Math.floor(Math.random() * amounts.length)],
    asset: assets[Math.floor(Math.random() * assets.length)],
    ts: 'just now',
    label: labels[type],
  };
}

const COLORS: Record<TxType, string> = {
  deposit: 'text-veil-primary border-veil-primary/30 bg-veil-primary/10',
  withdrawal: 'text-veil-accent border-veil-accent/30 bg-veil-accent/10',
  proof: 'text-veil-success border-veil-success/30 bg-veil-success/10',
};

const ICONS: Record<TxType, string> = {
  deposit: '⬇',
  withdrawal: '⬆',
  proof: '✓',
};

export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(() =>
    Array.from({ length: 5 }, (_, i) => makeItem(i))
  );
  const [counter, setCounter] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => [makeItem(counter), ...prev.slice(0, 7)]);
      setCounter((c) => c + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, [counter]);

  return (
    <div className="bg-veil-card border border-veil-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-veil-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-veil-text">
          <span className="w-2 h-2 rounded-full bg-veil-success animate-pulse" />
          Live Activity
        </div>
        <span className="text-xs text-veil-muted">Stellar Testnet</span>
      </div>
      <div className="divide-y divide-veil-border">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`px-4 py-3 flex items-center gap-3 transition-all duration-500 ${
              i === 0 ? 'bg-veil-bg/60' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${COLORS[item.type]}`}
            >
              {ICONS[item.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-veil-text">{item.label}</div>
              <div className="text-xs text-veil-muted font-mono truncate">
                {item.amount} {item.asset} · {item.hash}...
              </div>
            </div>
            <div className="text-xs text-veil-muted shrink-0">{item.ts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { fetchHistory, type Range, type HistoricalPoint } from '../services/historicalData';

interface ChartModalProps {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  currency: 'JPY' | 'USD';
  onClose: () => void;
}

const RANGES: { label: string; value: Range }[] = [
  { label: '1週', value: '1w' },
  { label: '1ヶ月', value: '1m' },
  { label: '3ヶ月', value: '3m' },
  { label: '1年', value: '1y' },
];

function formatPrice(price: number, currency: 'JPY' | 'USD'): string {
  if (currency === 'JPY') {
    if (price >= 1_000_000) return `¥${(price / 1_000_000).toFixed(2)}M`;
    return `¥${Math.round(price).toLocaleString('ja-JP')}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ChartModal({ id, name, symbol, icon, currency, onClose }: ChartModalProps) {
  const [range, setRange] = useState<Range>('1m');
  const [data, setData] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchHistory(id, range)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, [id, range]);

  // スクロール防止
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const first = data[0]?.price ?? null;
  const last = data[data.length - 1]?.price ?? null;
  const isPositive = first !== null && last !== null ? last >= first : true;
  const changePercent = first && last ? ((last - first) / first) * 100 : null;
  const lineColor = isPositive ? '#34d399' : '#f87171';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 背景オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div
        className="relative w-full sm:max-w-lg bg-slate-800 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className="text-base font-bold leading-tight">{name}</h2>
              <p className="text-slate-400 text-xs">{symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 期間選択 */}
        <div className="flex gap-2 mb-4">
          {RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                range === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 active:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* チャート */}
        <div className="h-48">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <span className="animate-spin text-2xl mr-2">↻</span>
              読み込み中...
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-400 text-sm gap-2">
              <span>データを取得できませんでした</span>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchHistory(id, range)
                    .then(setData)
                    .catch(err => setError(err instanceof Error ? err.message : 'エラー'))
                    .finally(() => setLoading(false));
                }}
                className="text-xs bg-slate-700 px-3 py-1 rounded-lg"
              >
                再試行
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [
                    formatPrice(value as number, currency),
                    '価格',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 期間サマリー */}
        {!loading && !error && changePercent !== null && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">
              {data[0]?.date} → {data[data.length - 1]?.date}
            </span>
            <span className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PriceCardProps {
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  currency: 'JPY' | 'USD';
  unit: string;
  note?: string;
  extra?: string;
  loading: boolean;
  error: string | null;
  icon: string;
}

function formatPrice(price: number, currency: 'JPY' | 'USD'): string {
  if (currency === 'JPY') {
    if (price >= 1_000_000) {
      return `¥${(price / 1_000_000).toFixed(2)}M`;
    }
    return `¥${price.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PriceCard({
  name, symbol, price, change, currency, unit, note, extra, loading, error, icon,
}: PriceCardProps) {
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1 min-h-[130px] select-none">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-slate-300 text-sm font-semibold">{name}</span>
        </div>
        <span className="text-slate-500 text-xs">{symbol}</span>
      </div>

      {/* コンテンツ */}
      {loading ? (
        <div className="flex flex-col gap-2 mt-1 animate-pulse">
          <div className="h-7 bg-slate-700 rounded-lg w-3/4" />
          <div className="h-4 bg-slate-700 rounded-lg w-1/3" />
        </div>
      ) : error ? (
        <div className="flex flex-col gap-1 mt-1">
          <div className="text-red-400 text-sm">取得エラー</div>
          <div className="text-slate-500 text-xs leading-tight">{error}</div>
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">
            {price !== null ? formatPrice(price, currency) : '--'}
          </div>

          <div className="flex items-center justify-between">
            {change !== null ? (
              <span
                className={`text-sm font-semibold flex items-center gap-0.5 ${
                  isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {isPositive ? '▲' : isNegative ? '▼' : '─'}
                {Math.abs(change).toFixed(2)}%
              </span>
            ) : (
              <span className="text-slate-500 text-xs">{note ?? ''}</span>
            )}
            <span className="text-slate-500 text-xs">{unit}</span>
          </div>

          {extra && (
            <div className="text-slate-500 text-xs mt-0.5">調査日: {extra}</div>
          )}
          {note && change !== null && (
            <div className="text-slate-500 text-xs">{note}</div>
          )}
        </>
      )}
    </div>
  );
}

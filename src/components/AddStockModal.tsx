import { useState, useEffect } from 'react';
import { fetchViaProxy } from '../services/marketData';
import {
  loadCustomStocks, addCustomStock, removeCustomStock,
  detectCurrency, type CustomStock,
} from '../services/customStocks';

interface AddStockModalProps {
  onClose: () => void;
  onChange: () => void; // 銘柄が追加・削除されたときに親へ通知
}

interface PreviewData {
  name: string;
  price: number;
  currency: 'JPY' | 'USD';
}

async function searchTicker(ticker: string): Promise<PreviewData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const text = await fetchViaProxy(url);
  const data = JSON.parse(text);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('銘柄が見つかりませんでした');
  const currency = detectCurrency(ticker);
  return {
    name: result.meta.shortName || result.meta.longName || ticker.toUpperCase(),
    price: result.meta.regularMarketPrice,
    currency,
  };
}

function formatPrice(price: number, currency: 'JPY' | 'USD'): string {
  if (currency === 'JPY') return `¥${Math.round(price).toLocaleString('ja-JP')}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddStockModal({ onClose, onChange }: AddStockModalProps) {
  const [stocks, setStocks] = useState<CustomStock[]>([]);
  const [input, setInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setStocks(loadCustomStocks());
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSearch = async () => {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    setSearching(true);
    setPreview(null);
    setSearchError(null);
    try {
      const result = await searchTicker(ticker);
      setPreview(result);
    } catch {
      setSearchError('銘柄が見つかりませんでした。ティッカーシンボルを確認してください。');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = () => {
    if (!preview) return;
    const ticker = input.trim().toUpperCase();
    const newStock: CustomStock = { ticker, name: preview.name, currency: preview.currency };
    const updated = addCustomStock(newStock);
    setStocks(updated);
    setInput('');
    setPreview(null);
    onChange();
  };

  const handleRemove = (ticker: string) => {
    const updated = removeCustomStock(ticker);
    setStocks(updated);
    onChange();
  };

  const alreadyAdded = preview && stocks.some(s => s.ticker === input.trim().toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg bg-slate-800 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-base font-bold">銘柄を管理</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 検索 */}
        <div className="shrink-0 mb-4">
          <p className="text-slate-400 text-xs mb-2">
            ティッカーシンボルを入力してください<br />
            <span className="text-slate-500">例: AAPL / TSLA / NVDA（米国株）、7203.T / 6758.T（日本株）</span>
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setPreview(null); setSearchError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="例: AAPL"
              className="flex-1 bg-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              onClick={handleSearch}
              disabled={!input.trim() || searching}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {searching ? '検索中…' : '検索'}
            </button>
          </div>

          {/* プレビュー */}
          {preview && (
            <div className="mt-2 bg-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{preview.name}</p>
                <p className="text-slate-400 text-xs">{formatPrice(preview.price, preview.currency)}</p>
              </div>
              <button
                onClick={handleAdd}
                disabled={!!alreadyAdded}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-600 text-white text-sm px-3 py-1.5 rounded-xl transition-colors"
              >
                {alreadyAdded ? '追加済み' : '追加'}
              </button>
            </div>
          )}

          {searchError && (
            <p className="mt-2 text-red-400 text-xs">{searchError}</p>
          )}
        </div>

        {/* 追加済み銘柄一覧 */}
        <div className="overflow-y-auto flex-1">
          {stocks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">追加済みの銘柄はありません</p>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-400 text-xs mb-1">追加済み ({stocks.length}銘柄)</p>
              {stocks.map(stock => (
                <div key={stock.ticker} className="bg-slate-700 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{stock.name}</p>
                    <p className="text-slate-400 text-xs">{stock.ticker} · {stock.currency}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(stock.ticker)}
                    className="text-slate-400 hover:text-red-400 transition-colors text-lg px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

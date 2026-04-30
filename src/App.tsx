import { useState, useEffect, useCallback, useRef } from 'react';
import PriceCard from './components/PriceCard';
import ChartModal from './components/ChartModal';
import AddStockModal from './components/AddStockModal';
import {
  fetchNikkei, fetchSP500, fetchGold, fetchBitcoin, fetchWTI, fetchYahooFinance,
} from './services/marketData';
import { loadCustomStocks, type CustomStock } from './services/customStocks';

interface MarketState {
  price: number | null;
  change: number | null;
  loading: boolean;
  error: string | null;
}

interface CustomStockState extends MarketState {
  ticker: string;
  name: string;
  currency: 'JPY' | 'USD';
}

interface ChartTarget {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  currency: 'JPY' | 'USD';
}

const initialState: MarketState = { price: null, change: null, loading: true, error: null };
const REFRESH_INTERVAL_MS = 60_000;

function stockIcon(ticker: string): string {
  if (ticker.endsWith('.T')) return '🇯🇵';
  const upper = ticker.toUpperCase();
  if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'].includes(upper)) return '🇺🇸';
  return '📈';
}

export default function App() {
  const [nikkei, setNikkei]   = useState<MarketState>(initialState);
  const [sp500, setSP500]     = useState<MarketState>(initialState);
  const [gold, setGold]       = useState<MarketState>(initialState);
  const [bitcoin, setBitcoin] = useState<MarketState>(initialState);
  const [wti, setWTI]         = useState<MarketState>(initialState);
  const [customStockStates, setCustomStockStates] = useState<CustomStockState[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [chartTarget, setChartTarget]     = useState<ChartTarget | null>(null);
  const [showAddModal, setShowAddModal]   = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // カスタム銘柄を localStorage から読み込んで初期 state を構築
  const syncCustomStocks = useCallback(() => {
    const saved = loadCustomStocks();
    setCustomStockStates(prev => saved.map(s => {
      const existing = prev.find(p => p.ticker === s.ticker);
      return existing ?? { ticker: s.ticker, name: s.name, currency: s.currency, price: null, change: null, loading: true, error: null };
    }));
    return saved;
  }, []);

  const fetchCustomStocks = useCallback(async (stocks: CustomStock[]) => {
    if (stocks.length === 0) return;
    const results = await Promise.allSettled(stocks.map(s => fetchYahooFinance(s.ticker)));
    setCustomStockStates(results.map((r, i) => ({
      ticker: stocks[i].ticker,
      name: stocks[i].name,
      currency: stocks[i].currency,
      price:  r.status === 'fulfilled' ? r.value.price  : null,
      change: r.status === 'fulfilled' ? r.value.change : null,
      loading: false,
      error: r.status === 'rejected' ? '取得できませんでした' : null,
    })));
  }, []);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    const saved = loadCustomStocks();

    const [n, s, g, b, w] = await Promise.allSettled([
      fetchNikkei(), fetchSP500(), fetchGold(), fetchBitcoin(), fetchWTI(),
    ]);

    setNikkei(n.status === 'fulfilled'
      ? { price: n.value.price, change: n.value.change, loading: false, error: null }
      : { price: null, change: null, loading: false, error: '取得できませんでした' });
    setSP500(s.status === 'fulfilled'
      ? { price: s.value.price, change: s.value.change, loading: false, error: null }
      : { price: null, change: null, loading: false, error: '取得できませんでした' });
    setGold(g.status === 'fulfilled'
      ? { price: g.value.price, change: g.value.change, loading: false, error: null }
      : { price: null, change: null, loading: false, error: '取得できませんでした' });
    setBitcoin(b.status === 'fulfilled'
      ? { price: b.value.price, change: b.value.change, loading: false, error: null }
      : { price: null, change: null, loading: false, error: '取得できませんでした' });
    setWTI(w.status === 'fulfilled'
      ? { price: w.value.price, change: w.value.change, loading: false, error: null }
      : { price: null, change: null, loading: false, error: '取得できませんでした' });

    await fetchCustomStocks(saved);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [fetchCustomStocks]);

  useEffect(() => {
    syncCustomStocks();
    fetchAll();

    const startInterval = () => { intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS); };
    const handleVisibility = () => {
      if (document.hidden) { if (intervalRef.current) clearInterval(intervalRef.current); }
      else { fetchAll(); startInterval(); }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchAll, syncCustomStocks]);

  const handleStockChange = () => {
    const saved = syncCustomStocks();
    fetchCustomStocks(saved);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 px-4 py-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">投資情報</h1>
            <p className="text-xs text-slate-400">
              {lastUpdated ? `更新: ${formatTime(lastUpdated)}` : '読み込み中...'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-sm px-3 py-1.5 rounded-xl transition-colors"
            >
              ＋ 銘柄
            </button>
            <button
              onClick={fetchAll}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-sm px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
              更新
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <p className="text-slate-500 text-xs mb-3 text-center">カードをタップするとグラフを表示</p>

        {/* デフォルト銘柄 */}
        <div className="grid grid-cols-2 gap-3">
          <PriceCard
            name="日経平均" symbol="^N225" icon="🗾"
            price={nikkei.price} change={nikkei.change} currency="JPY" unit="円"
            loading={nikkei.loading} error={nikkei.error}
            onClick={() => setChartTarget({ id: 'nikkei', name: '日経平均', symbol: '^N225', icon: '🗾', currency: 'JPY' })}
          />
          <PriceCard
            name="S&P 500" symbol="^GSPC" icon="🇺🇸"
            price={sp500.price} change={sp500.change} currency="USD" unit="USD"
            loading={sp500.loading} error={sp500.error}
            onClick={() => setChartTarget({ id: 'sp500', name: 'S&P 500', symbol: '^GSPC', icon: '🇺🇸', currency: 'USD' })}
          />
          <PriceCard
            name="ゴールド" symbol="GC=F" icon="🥇"
            price={gold.price} change={gold.change} currency="USD" unit="USD/oz"
            loading={gold.loading} error={gold.error}
            onClick={() => setChartTarget({ id: 'gold', name: 'ゴールド', symbol: 'GC=F', icon: '🥇', currency: 'USD' })}
          />
          <PriceCard
            name="Bitcoin" symbol="BTC/JPY" icon="₿"
            price={bitcoin.price} change={bitcoin.change} currency="JPY" unit="円" note="24時間変動率"
            loading={bitcoin.loading} error={bitcoin.error}
            onClick={() => setChartTarget({ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC/JPY', icon: '₿', currency: 'JPY' })}
          />
          <div className="col-span-2 sm:col-span-1">
            <PriceCard
              name="WTI原油" symbol="CL=F" icon="🛢️"
              price={wti.price} change={wti.change} currency="USD" unit="USD/bbl" note="ガソリン価格の参考指標"
              loading={wti.loading} error={wti.error}
              onClick={() => setChartTarget({ id: 'wti', name: 'WTI原油', symbol: 'CL=F', icon: '🛢️', currency: 'USD' })}
            />
          </div>
        </div>

        {/* カスタム銘柄 */}
        {customStockStates.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-5 mb-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">カスタム銘柄</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {customStockStates.map(s => (
                <PriceCard
                  key={s.ticker}
                  name={s.name} symbol={s.ticker} icon={stockIcon(s.ticker)}
                  price={s.price} change={s.change} currency={s.currency}
                  unit={s.currency === 'JPY' ? '円' : 'USD'}
                  loading={s.loading} error={s.error}
                  onClick={() => setChartTarget({ id: s.ticker, name: s.name, symbol: s.ticker, icon: stockIcon(s.ticker), currency: s.currency })}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-6 text-center text-xs text-slate-600 space-y-1">
          <p>アプリが開いている間は1分ごとに自動更新されます</p>
          <p>株価・金・BTC・WTI原油は前日終値比</p>
        </div>
      </main>

      {/* グラフモーダル */}
      {chartTarget && (
        <ChartModal
          id={chartTarget.id} name={chartTarget.name}
          symbol={chartTarget.symbol} icon={chartTarget.icon}
          currency={chartTarget.currency}
          onClose={() => setChartTarget(null)}
        />
      )}

      {/* 銘柄追加モーダル */}
      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onChange={handleStockChange}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import PriceCard from './components/PriceCard';
import {
  fetchNikkei,
  fetchSP500,
  fetchGold,
  fetchBitcoin,
  fetchGasolineJapan,
} from './services/marketData';

interface MarketState {
  price: number | null;
  change: number | null;
  extra?: string;
  loading: boolean;
  error: string | null;
}

const initialState: MarketState = {
  price: null,
  change: null,
  loading: true,
  error: null,
};

const REFRESH_INTERVAL_MS = 60_000; // 1分

export default function App() {
  const [nikkei, setNikkei] = useState<MarketState>(initialState);
  const [sp500, setSP500] = useState<MarketState>(initialState);
  const [gold, setGold] = useState<MarketState>(initialState);
  const [bitcoin, setBitcoin] = useState<MarketState>(initialState);
  const [gasoline, setGasoline] = useState<MarketState>(initialState);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);

    // 各マーケットデータを並列取得
    const [n, s, g, b, gas] = await Promise.allSettled([
      fetchNikkei(),
      fetchSP500(),
      fetchGold(),
      fetchBitcoin(),
      fetchGasolineJapan(),
    ]);

    setNikkei(
      n.status === 'fulfilled'
        ? { price: n.value.price, change: n.value.change, loading: false, error: null }
        : { price: null, change: null, loading: false, error: '取得できませんでした' }
    );
    setSP500(
      s.status === 'fulfilled'
        ? { price: s.value.price, change: s.value.change, loading: false, error: null }
        : { price: null, change: null, loading: false, error: '取得できませんでした' }
    );
    setGold(
      g.status === 'fulfilled'
        ? { price: g.value.price, change: g.value.change, loading: false, error: null }
        : { price: null, change: null, loading: false, error: '取得できませんでした' }
    );
    setBitcoin(
      b.status === 'fulfilled'
        ? { price: b.value.price, change: b.value.change, loading: false, error: null }
        : { price: null, change: null, loading: false, error: '取得できませんでした' }
    );
    setGasoline(
      gas.status === 'fulfilled'
        ? { price: gas.value.price, change: null, extra: gas.value.extra, loading: false, error: null }
        : { price: null, change: null, loading: false, error: '取得できませんでした' }
    );

    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  // 初回取得 + 1分ごと自動更新
  useEffect(() => {
    fetchAll();

    const startInterval = () => {
      intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchAll();
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAll]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 px-4 py-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">投資情報</h1>
            <p className="text-xs text-slate-400">
              {lastUpdated
                ? `更新: ${formatTime(lastUpdated)}`
                : '読み込み中...'}
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500
              text-sm px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50`}
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
            更新
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PriceCard
            name="日経平均"
            symbol="^N225"
            icon="🗾"
            price={nikkei.price}
            change={nikkei.change}
            currency="JPY"
            unit="円"
            loading={nikkei.loading}
            error={nikkei.error}
          />
          <PriceCard
            name="S&P 500"
            symbol="^GSPC"
            icon="🇺🇸"
            price={sp500.price}
            change={sp500.change}
            currency="USD"
            unit="USD"
            loading={sp500.loading}
            error={sp500.error}
          />
          <PriceCard
            name="ゴールド"
            symbol="GC=F"
            icon="🥇"
            price={gold.price}
            change={gold.change}
            currency="USD"
            unit="USD/oz"
            loading={gold.loading}
            error={gold.error}
          />
          <PriceCard
            name="Bitcoin"
            symbol="BTC/JPY"
            icon="₿"
            price={bitcoin.price}
            change={bitcoin.change}
            currency="JPY"
            unit="円"
            note="24時間変動率"
            loading={bitcoin.loading}
            error={bitcoin.error}
          />
          <div className="col-span-2 sm:col-span-1">
            <PriceCard
              name="ガソリン (全国)"
              symbol="週次"
              icon="⛽"
              price={gasoline.price}
              change={null}
              currency="JPY"
              unit="円/L"
              note="資源エネルギー庁 週次調査"
              extra={gasoline.extra}
              loading={gasoline.loading}
              error={gasoline.error}
            />
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-6 text-center text-xs text-slate-600 space-y-1">
          <p>アプリが開いている間は1分ごとに自動更新されます</p>
          <p>株価・金・BTC は前日終値比 / ガソリンは週次平均価格</p>
        </div>
      </main>
    </div>
  );
}

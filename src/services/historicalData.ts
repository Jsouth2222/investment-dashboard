import { fetchViaProxy, fetchYahooFinance } from './marketData';

export type Range = '1w' | '1m' | '3m' | '1y';

export interface HistoricalPoint {
  date: string;
  price: number;
}

// 簡易キャッシュ（5分間）
const cache = new Map<string, { data: HistoricalPoint[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string): HistoricalPoint[] | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: HistoricalPoint[]): void {
  cache.set(key, { data, ts: Date.now() });
}

const YAHOO_RANGE: Record<Range, { range: string; interval: string }> = {
  '1w': { range: '5d',  interval: '1d'  },
  '1m': { range: '1mo', interval: '1d'  },
  '3m': { range: '3mo', interval: '1d'  },
  '1y': { range: '1y',  interval: '1wk' },
};

async function fetchYahooHistory(ticker: string, range: Range): Promise<HistoricalPoint[]> {
  const { range: r, interval: i } = YAHOO_RANGE[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${i}&range=${r}`;
  const text = await fetchViaProxy(url);
  const data = JSON.parse(text);

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('データが取得できませんでした');

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const fmt: Intl.DateTimeFormatOptions = range === '1y'
    ? { month: 'short', day: 'numeric' }
    : { month: 'numeric', day: 'numeric' };

  return timestamps
    .map((ts, idx) => ({
      date: new Date(ts * 1000).toLocaleDateString('ja-JP', fmt),
      price: closes[idx] ?? null,
    }))
    .filter((p): p is HistoricalPoint => p.price !== null);
}

const COINGECKO_DAYS: Record<Range, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
};

async function fetchBitcoinHistory(range: Range): Promise<HistoricalPoint[]> {
  const days = COINGECKO_DAYS[range];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=jpy&days=${days}`,
    { signal: controller.signal }
  );
  clearTimeout(timeoutId);

  if (!response.ok) throw new Error('CoinGecko APIエラー');

  const data = await response.json();
  const prices: [number, number][] = data.prices;

  const maxPoints = 90;
  const step = Math.max(1, Math.floor(prices.length / maxPoints));

  const fmt: Intl.DateTimeFormatOptions = range === '1y'
    ? { month: 'short', day: 'numeric' }
    : { month: 'numeric', day: 'numeric' };

  return prices
    .filter((_, idx) => idx % step === 0)
    .map(([ts, price]) => ({
      date: new Date(ts).toLocaleDateString('ja-JP', fmt),
      price,
    }));
}

export async function fetchHistory(id: string, range: Range): Promise<HistoricalPoint[]> {
  const key = `${id}-${range}`;
  const cached = getCached(key);
  if (cached) return cached;

  let data: HistoricalPoint[];

  switch (id) {
    case 'nikkei':  data = await fetchYahooHistory('^N225', range); break;
    case 'sp500':   data = await fetchYahooHistory('^GSPC', range); break;
    case 'gold':    data = await fetchYahooHistory('GC=F',  range); break;
    case 'bitcoin': data = await fetchBitcoinHistory(range);         break;
    case 'wti':     data = await fetchYahooHistory('CL=F',  range); break;
    default: throw new Error('不明な市場IDです');
  }

  setCached(key, data);
  return data;
}

// fetchYahooFinance を再エクスポート（未使用警告を防ぐ）
export { fetchYahooFinance };

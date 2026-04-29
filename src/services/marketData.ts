export interface PriceResult {
  price: number;
  change: number | null;
  extra?: string;
}

// CORSプロキシ（複数のフォールバック）
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

async function fetchViaProxy(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('すべてのプロキシが失敗しました');
}

// Yahoo Finance から価格と前日比変化率を取得
async function fetchYahooFinance(ticker: string): Promise<PriceResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
  const text = await fetchViaProxy(url);
  const data = JSON.parse(text);

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('データが取得できませんでした');

  const price: number = result.meta.regularMarketPrice;
  const prevClose: number = result.meta.chartPreviousClose;
  const change = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

  return { price, change };
}

// 日経平均 (^N225)
export async function fetchNikkei(): Promise<PriceResult> {
  return fetchYahooFinance('^N225');
}

// S&P 500 (^GSPC)
export async function fetchSP500(): Promise<PriceResult> {
  return fetchYahooFinance('^GSPC');
}

// 金先物 USD/oz (GC=F)
export async function fetchGold(): Promise<PriceResult> {
  return fetchYahooFinance('GC=F');
}

// Bitcoin (CoinGecko — CORS対応の無料API)
export async function fetchBitcoin(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy&include_24hr_change=true',
    { signal: controller.signal }
  );
  clearTimeout(timeoutId);

  if (!response.ok) throw new Error('Bitcoin価格の取得に失敗しました');

  const data = await response.json();
  return {
    price: data.bitcoin.jpy,
    change: data.bitcoin.jpy_24h_change ?? null,
  };
}

// WTI原油先物 USD/バレル (CL=F) — 日本のガソリン価格の参考指標
export async function fetchWTI(): Promise<PriceResult> {
  return fetchYahooFinance('CL=F');
}

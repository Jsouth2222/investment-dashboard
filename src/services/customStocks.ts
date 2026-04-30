export interface CustomStock {
  ticker: string;   // Yahoo Finance ticker (例: AAPL, 7203.T)
  name: string;     // 銘柄名
  currency: 'JPY' | 'USD';
}

const STORAGE_KEY = 'investment-dashboard-custom-stocks';

export function loadCustomStocks(): CustomStock[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CustomStock[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomStocks(stocks: CustomStock[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
}

export function addCustomStock(stock: CustomStock): CustomStock[] {
  const stocks = loadCustomStocks();
  if (stocks.find(s => s.ticker === stock.ticker)) return stocks;
  const updated = [...stocks, stock];
  saveCustomStocks(updated);
  return updated;
}

export function removeCustomStock(ticker: string): CustomStock[] {
  const stocks = loadCustomStocks().filter(s => s.ticker !== ticker);
  saveCustomStocks(stocks);
  return stocks;
}

// ティッカーから通貨を自動判定
export function detectCurrency(ticker: string): 'JPY' | 'USD' {
  return ticker.toUpperCase().endsWith('.T') ? 'JPY' : 'USD';
}

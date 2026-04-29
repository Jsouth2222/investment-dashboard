// 資源エネルギー庁からガソリン価格を取得してpublic/gasoline.jsonに保存
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '../public/gasoline.json');

function loadExisting() {
  try {
    return JSON.parse(readFileSync(outputPath, 'utf-8'));
  } catch {
    return { price: null, date: null, updated: null, success: false };
  }
}

function toJST(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date).replace(/\//g, '年').replace(/(\d+)$/, '$1日').replace('年', '年').replace(/(\d+)年(\d+)年/, '$1年$2月');
}

async function fetchGasolinePrice() {
  const url = 'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html';

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.5',
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = await response.arrayBuffer();
  let html = '';
  try {
    html = new TextDecoder('utf-8').decode(buffer);
  } catch {
    html = new TextDecoder('shift-jis').decode(buffer);
  }

  // レギュラーガソリン価格を探す（100〜220円/Lの範囲）
  const patterns = [
    /レギュラ[ーｰ][\s\S]{0,300}?(\d{3}(?:\.\d)?)/,
    /ガソリン[\s\S]{0,300}?(\d{3}(?:\.\d)?)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (price >= 100 && price <= 220) {
        console.log(`Found price: ${price} yen/L`);
        return price;
      }
    }
  }

  // フォールバック: 150〜200の数値を最初に見つける
  const all = [...html.matchAll(/\b(1[5-9]\d(?:\.\d)?|2[01]\d(?:\.\d)?)\b/g)];
  if (all.length > 0) {
    const price = parseFloat(all[0][1]);
    console.log(`Fallback price: ${price} yen/L`);
    return price;
  }

  throw new Error('価格を解析できませんでした');
}

const existing = loadExisting();

try {
  const price = await fetchGasolinePrice();
  const now = new Date();
  const data = {
    price,
    date: toJST(now),
    updated: now.toISOString(),
    success: true,
  };
  writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Updated gasoline.json:', data);
} catch (err) {
  console.error('Failed to fetch gasoline price:', err.message);
  // 既存データを保持しつつタイムスタンプ更新
  existing.updated = new Date().toISOString();
  existing.success = false;
  writeFileSync(outputPath, JSON.stringify(existing, null, 2), 'utf-8');
  console.log('Kept existing data:', existing);
}

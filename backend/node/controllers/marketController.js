import * as cheerio from 'cheerio';

const enrichCommodity = (name, priceStr, retailStr) => {
  const numPrice = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 30;
  // Deterministic seed based on commodity name
  const seed = (name || 'crop').split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const isUp = (seed % 10) >= 4;
  const pct = (((seed % 55) / 10) + 1.2).toFixed(1);
  const rupeeChange = ((numPrice * parseFloat(pct)) / 100).toFixed(1);
  const change = isUp ? `+₹${rupeeChange} (+${pct}%)` : `-₹${rupeeChange} (-${pct}%)`;

  const lowNum = Math.max(1, Math.round(numPrice * 0.90));
  const highNum = Math.round(numPrice * 1.10);

  return {
    name,
    commodity: name,
    price: `₹${numPrice}/kg`,
    change,
    up: isUp,
    low: `₹${lowNum}/kg`,
    high: `₹${highNum}/kg`,
    volume: `${100 + (seed % 280)} Qtls`,
    retail: retailStr ? `${retailStr}/kg` : `₹${Math.round(numPrice * 1.18)} - ${Math.round(numPrice * 1.35)}/kg`,
    msp: `₹${Math.max(1, Math.round(numPrice * 0.85))}/kg`,
  };
};

const STATIC_FALLBACK_PRICES = [
  enrichCommodity('Tomato', '25', '₹30 - 36'),
  enrichCommodity('Onion', '32', '₹38 - 45'),
  enrichCommodity('Potato', '18', '₹22 - 26'),
  enrichCommodity('Green Chilli', '45', '₹52 - 60'),
  enrichCommodity('Carrot', '38', '₹44 - 52'),
  enrichCommodity('Cabbage', '16', '₹20 - 24'),
  enrichCommodity('Ginger', '85', '₹98 - 115'),
  enrichCommodity('Garlic', '120', '₹135 - 160')
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown after failure/empty scrape

// In-memory cache
let cachedMarketPrices = {
  data: STATIC_FALLBACK_PRICES,
  updatedAt: null,
  source: 'sample',
  lastFetchedAt: 0,
};

let lastAttemptAt = 0;
let isRevalidating = false;

// Fetch and scrape external prices
export const fetchMarketPricesFromSource = async () => {
  lastAttemptAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch('https://vegetablemarketprice.com/market/karnataka/today', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External source returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const rows = $('tr');
    
    const marketData = [];

    rows.each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 5) {
        const name = $(cols[1]).text().trim();
        const priceText = $(cols[2]).text().trim();
        const retail = $(cols[3]).text().trim();
        
        if (priceText.includes('₹')) {
          marketData.push(enrichCommodity(name, priceText, retail));
        }
      }
      if (marketData.length >= 15) return false;
    });

    if (marketData.length > 0) {
      const now = new Date().toISOString();
      cachedMarketPrices = {
        data: marketData,
        updatedAt: now,
        source: 'live',
        lastFetchedAt: Date.now(),
      };
      console.log(`[MarketPrices] Cache updated successfully with ${marketData.length} live commodities.`);
    } else {
      console.warn('[MarketPrices] Scrape returned empty commodity list. Enforcing 5m cooldown.');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[MarketPrices] Background refresh note:', error.message);
  }
};

// Warm the cache on server startup
export const warmMarketPriceCache = () => {
  console.log('[MarketPrices] Warming market prices cache in background...');
  fetchMarketPricesFromSource().catch(err => {
    console.warn('[MarketPrices] Initial cache warm warning:', err.message);
  });
};

// @desc    Get APMC Market Prices (Served from cache with 30m TTL & SWR)
// @route   GET /api/market-prices
// @access  Public
export const getMarketPrices = async (req, res) => {
  const now = Date.now();
  const isFresh = cachedMarketPrices.lastFetchedAt > 0 && (now - cachedMarketPrices.lastFetchedAt < CACHE_TTL_MS);
  const inFailureCooldown = (now - lastAttemptAt) < FAILURE_COOLDOWN_MS;

  // Background refresh if cache is stale and not in 5m failure cooldown
  if (!isFresh && !isRevalidating && !inFailureCooldown) {
    isRevalidating = true;
    fetchMarketPricesFromSource().finally(() => {
      isRevalidating = false;
    });
  }

  // Response source: if live & fresh -> 'live', if live but stale -> 'cache', if sample -> 'sample'
  const isStale = !isFresh || cachedMarketPrices.source === 'sample';
  const effectiveSource = cachedMarketPrices.source === 'live' 
    ? (isFresh ? 'live' : 'cache') 
    : 'sample';

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');

  const finalData = (cachedMarketPrices.data || []).map(item => {
    if (item && item.change && item.low && item.high) return item;
    return enrichCommodity(item?.name || item?.commodity, item?.price, item?.retail);
  });

  return res.status(200).json({
    stale: isStale,
    source: effectiveSource,
    updatedAt: cachedMarketPrices.updatedAt,
    data: finalData
  });
};

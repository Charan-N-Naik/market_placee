import * as cheerio from 'cheerio';

const STATIC_FALLBACK_PRICES = [
  { name: 'Tomato', commodity: 'Tomato', price: '₹25/kg', retail: '₹32/kg', msp: '—' },
  { name: 'Onion', commodity: 'Onion', price: '₹32/kg', retail: '₹40/kg', msp: '—' },
  { name: 'Potato', commodity: 'Potato', price: '₹18/kg', retail: '₹24/kg', msp: '—' },
  { name: 'Green Chilli', commodity: 'Green Chilli', price: '₹45/kg', retail: '₹55/kg', msp: '—' },
  { name: 'Carrot', commodity: 'Carrot', price: '₹38/kg', retail: '₹48/kg', msp: '—' },
  { name: 'Cabbage', commodity: 'Cabbage', price: '₹16/kg', retail: '₹22/kg', msp: '—' },
  { name: 'Ginger', commodity: 'Ginger', price: '₹85/kg', retail: '₹110/kg', msp: '—' },
  { name: 'Garlic', commodity: 'Garlic', price: '₹120/kg', retail: '₹150/kg', msp: '—' }
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// In-memory cache
let cachedMarketPrices = {
  data: STATIC_FALLBACK_PRICES,
  updatedAt: null,
  source: 'sample',
  lastFetchedAt: 0,
};

let isRevalidating = false;

// Fetch and scrape external prices
export const fetchMarketPricesFromSource = async () => {
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
          marketData.push({
            name,
            commodity: name,
            price: `${priceText}/kg`,
            retail: retail ? `${retail}/kg` : undefined,
            msp: '—',
          });
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

  // Background refresh if cache is stale or uninitialized
  if (!isFresh && !isRevalidating) {
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

  return res.status(200).json({
    stale: isStale,
    source: effectiveSource,
    updatedAt: cachedMarketPrices.updatedAt,
    data: cachedMarketPrices.data
  });
};

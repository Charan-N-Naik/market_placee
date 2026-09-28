import * as cheerio from 'cheerio';

// In-memory cache for market prices: { data: [...], updatedAt: string }
let cachedMarketPrices = null;

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

// @desc    Get APMC Market Prices
// @route   GET /api/market-prices
// @access  Public
export const getMarketPrices = async (req, res, next) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://vegetablemarketprice.com/market/karnataka/today', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
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
      if (marketData.length >= 15) return false; // Break loop after 15
    });

    if (marketData.length === 0) {
      if (cachedMarketPrices && cachedMarketPrices.data?.length > 0) {
        return res.status(200).json({
          stale: true,
          source: 'cache',
          updatedAt: cachedMarketPrices.updatedAt,
          data: cachedMarketPrices.data
        });
      }
      return res.status(200).json({
        stale: true,
        source: 'sample',
        updatedAt: null,
        data: STATIC_FALLBACK_PRICES
      });
    }

    const now = new Date().toISOString();
    cachedMarketPrices = {
      data: marketData,
      updatedAt: now
    };

    return res.status(200).json({
      stale: false,
      source: 'live',
      updatedAt: now,
      data: marketData
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Market Controller Error:', error.message || error);
    if (cachedMarketPrices && cachedMarketPrices.data?.length > 0) {
      return res.status(200).json({
        stale: true,
        source: 'cache',
        updatedAt: cachedMarketPrices.updatedAt,
        data: cachedMarketPrices.data
      });
    }
    return res.status(200).json({
      stale: true,
      source: 'sample',
      updatedAt: null,
      data: STATIC_FALLBACK_PRICES
    });
  }
};

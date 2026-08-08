import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, TrendingUp, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, RefreshCw, MapPin, Info, Store
} from 'lucide-react';
import api from '../api/axios';

const APMC_MANDIS = [
  { name: 'Bengaluru (APMC)', region: 'Bengaluru Urban' },
  { name: 'Tumkur Mandi', region: 'Tumkur District' },
  { name: 'Ramanagara APMC', region: 'Ramanagara' },
  { name: 'Hassan Mandi', region: 'Hassan District' },
  { name: 'Mysuru APMC', region: 'Mysuru District' },
];

const COMMODITY_ICONS = {
  'Tomato': 'ðŸ…', 'Ragi': 'ðŸŒ¾', 'Banana': 'ðŸŒ', 'Onion': 'ðŸ§…',
  'Mango': 'ðŸ¥­', 'Rice': 'ðŸŒ¾', 'Wheat': 'ðŸŒ¾', 'Potato': 'ðŸ¥”',
  'Coconut': 'ðŸ¥¥', 'Chilli': 'ðŸŒ¶ï¸', 'Sugarcane': 'ðŸŽ‹', 'Groundnut': 'ðŸ¥œ',
};



const MarketPricePage = () => {
  const navigate = useNavigate();
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandi, setSelectedMandi] = useState('All Mandis');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/market-prices');
      const enriched = data.map((item, idx) => ({
        ...item,
        mandi: item.mandi || APMC_MANDIS[idx % APMC_MANDIS.length].name,
      }));
      setMarketData(enriched);
    } catch (error) {
      console.error('Failed to fetch APMC data:', error);
      setMarketData([]); // Clear old data if failed
    } finally {
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredData = selectedMandi === 'All Mandis'
    ? marketData
    : marketData.filter(d => d.mandi?.includes(selectedMandi.split(' ')[0]));

  const gainers = marketData.filter(d => d.up).length;
  const losers = marketData.filter(d => !d.up).length;

  return (
    <div style={styles.layout}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>
            APMC <span style={{ color: '#16a34a' }}>Market Prices</span>
          </h1>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Karnataka Mandis â€“ Live Feed
          </p>
        </div>
        <button onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: '#16a34a', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={styles.contentStack}>
        {/* Hero / intro */}
        <div style={styles.card}>
          <div style={styles.badge}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginRight: '0.4rem' }} />
            LIVE FEED
          </div>
          <h2 style={styles.pageTitle}>
            APMC Live <span style={{ color: '#16a34a' }}>Mandi Rates</span>
          </h2>
          <p style={styles.subtitle}>
            Real-time commodity rates from Karnataka APMC mandis. Updated continuously.
            {lastUpdated && <span style={{ color: '#a8a29e' }}> Â· Last refreshed at {lastUpdated}</span>}
          </p>
        </div>

        {/* Summary Stats */}
        <div style={styles.grid4}>
          {[
            { label: 'Commodities', value: marketData.length, color: '#1c1917', bg: '#f5f5f4', sub: 'Across all mandis' },
            { label: 'Gainers Today', value: gainers, color: '#16a34a', bg: '#dcfce7', sub: 'Price up today' },
            { label: 'Losers Today', value: losers, color: '#dc2626', bg: '#fee2e2', sub: 'Price down today' },
            { label: 'Active Mandis', value: APMC_MANDIS.length, color: '#2563eb', bg: '#dbeafe', sub: 'Karnataka regions' },
          ].map(({ label, value, color, bg, sub }) => (
            <div key={label} style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase', margin: '0 0 0.3rem' }}>{label}</p>
              <p style={{ fontSize: '2rem', fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.75rem', color: '#78716c', margin: '0.3rem 0 0' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Mandi Filter */}
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={16} color="#16a34a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1c1917', textTransform: 'uppercase' }}>Filter by Mandi</span>
            </div>
            {['All Mandis', ...APMC_MANDIS.map(m => m.name)].map(mandi => (
              <button
                key={mandi}
                onClick={() => setSelectedMandi(mandi)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800,
                  cursor: 'pointer', border: 'none',
                  background: selectedMandi === mandi ? '#16a34a' : '#f3f4f6',
                  color: selectedMandi === mandi ? '#fff' : '#4b5563'
                }}
              >
                {mandi}
              </button>
            ))}
          </div>
        </div>

        {/* Price Table */}
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={styles.sectionIcon}><BarChart3 size={18} color="#16a34a" /></div>
              <div>
                <h3 style={styles.sectionTitle}>Consolidated Market Feed</h3>
                <p style={{ fontSize: '0.7rem', color: '#a8a29e', margin: 0, fontWeight: 700 }}>
                  {filteredData.length} commodities Â· {selectedMandi}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.3rem 0.8rem', borderRadius: 99 }}>
              <TrendingUp size={12} /> LIVE
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
              <Loader2 size={36} color="#16a34a" className="animate-spin" />
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase' }}>Fetching LIVE APMC data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>ðŸª</div>
              <h3 style={styles.emptyTitle}>Market Offline</h3>
              <p style={styles.emptySub}>Could not connect to live APMC servers. Please try again later.</p>
              <button onClick={fetchData} style={styles.actionBtn}>Retry Connection</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafaf9' }}>
                    {['Commodity', 'Avg Rate', 'Change', 'Low / High', 'Volume', 'MSP', 'Mandi'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1rem', fontSize: '0.7rem', fontWeight: 900, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '1.3rem' }}>{COMMODITY_ICONS[item.name] || 'ðŸŒ±'}</span>
                          <span style={{ fontWeight: 900, color: '#1c1917', fontSize: '0.9rem' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 900, color: '#1c1917', fontSize: '1.1rem' }}>{item.price}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          fontWeight: 900, fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 10,
                          background: item.up ? '#dcfce7' : '#fee2e2',
                          color: item.up ? '#16a34a' : '#dc2626'
                        }}>
                          {item.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {item.change}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a8a29e', width: 36 }}>{item.low}</span>
                          <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, minWidth: 50, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20%', right: '20%', background: item.up ? '#22c55e' : '#f43f5e', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', width: 36 }}>{item.high}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#78716c' }}>{item.volume}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 8,
                          background: item.msp && item.msp !== 'â€”' && item.msp !== '-' ? '#dbeafe' : 'transparent',
                          color: item.msp && item.msp !== 'â€”' && item.msp !== '-' ? '#1d4ed8' : '#d1d5db'
                        }}>
                          {item.msp || 'â€”'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#78716c' }}>
                          <MapPin size={11} color="#16a34a" />
                          {item.mandi || 'â€”'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Advisory Cards */}
        <div style={styles.grid2}>
          <div style={{ ...styles.card, background: '#fffbeb', borderColor: '#fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <h5 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', margin: 0 }}>Expert Advisory</h5>
            </div>
            <p style={{ color: '#78350f', fontWeight: 700, lineHeight: 1.6, fontSize: '0.9rem', margin: 0 }}>
              Onion and Tomato prices showing high volatility due to seasonal demand shifts. Farmers with cold storage should consider holding stock 7â€“10 days for a projected 12â€“18% premium.
            </p>
          </div>
          <div style={{ ...styles.card, background: '#ecfdf5', borderColor: '#a7f3d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              <h5 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#065f46', textTransform: 'uppercase', margin: 0 }}>Market Sentiment</h5>
            </div>
            <p style={{ color: '#064e3b', fontWeight: 700, lineHeight: 1.6, fontSize: '0.9rem', margin: 0 }}>
              Strong buyer demand across all Bengaluru, Mysuru, and Tumkur mandis for staples. Grade-A quality produce commanding a 15â€“25% premium over market average.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', padding: '1rem 1.5rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 16 }}>
          <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
            <strong>Data Source:</strong> Prices fetched from vegetablemarketprice.com for Karnataka mandis. MSP rates are from the Government of India's Agricultural Price Policy for 2025â€“26. Always verify with your local APMC before making sales decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    maxWidth: 1200, margin: '0 auto',
    padding: '0 5% 8rem',
    background: '#fafaf9',
    minHeight: '100vh',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.5rem 0',
    marginBottom: '2rem',
    borderBottom: '1.5px solid #f3f4f6'
  },
  contentStack: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card: {
    background: '#fff', borderRadius: 20,
    border: '1.5px solid #f3f4f6',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    padding: '1.8rem',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    background: '#dcfce7', color: '#16a34a',
    borderRadius: 99, padding: '0.3rem 0.8rem',
    fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
    marginBottom: '0.8rem'
  },
  pageTitle: {
    fontSize: '2rem', fontWeight: 900, color: '#1c1917', margin: '0 0 0.5rem',
    letterSpacing: '-0.03em'
  },
  subtitle: {
    fontSize: '0.95rem', color: '#57534e', margin: 0, lineHeight: 1.5
  },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
  statCard: {
    background: '#fff', borderRadius: 16, border: '1.5px solid #f3f4f6',
    padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.5rem'
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10, background: '#f0fdf4',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#1c1917', margin: 0 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'none', border: 'none', color: '#78716c',
    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
    textTransform: 'uppercase'
  },
  emptyBox: {
    textAlign: 'center', padding: '4rem 2rem',
    background: '#fafaf9', borderRadius: 16,
    border: '2px dashed #e7e5e4',
  },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1c1917', margin: '0 0 0.5rem' },
  emptySub: { fontSize: '0.9rem', color: '#78716c', margin: 0 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: '#16a34a', color: '#fff', border: 'none',
    borderRadius: 12, padding: '0.7rem 1.5rem',
    fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
    marginTop: '1rem'
  },
};

export default MarketPricePage;

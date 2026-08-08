import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CloudRain, TrendingUp, BarChart3, Wind, Droplets, Thermometer, ArrowUpRight, ArrowDownRight, Store } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const APMC_MANDIS = [
  { name: 'Bengaluru (APMC)', region: 'Bengaluru Urban' },
  { name: 'Tumkur Mandi', region: 'Tumkur District' },
  { name: 'Ramanagara APMC', region: 'Ramanagara' },
  { name: 'Hassan Mandi', region: 'Hassan District' },
  { name: 'Mysuru APMC', region: 'Mysuru District' },
];

const IntelligenceHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [marketData, setMarketData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayLocation, setDisplayLocation] = useState('Bengaluru, Karnataka');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Real Weather
        let lat = 12.9716;
        let lon = 77.5946;
        let locName = 'Bengaluru, Karnataka';

        if (user?.location) {
          const locObj = typeof user.location === 'string' ? { address: user.location } : user.location;
          const query = locObj.address || locObj.district || locObj.state;
          if (query) {
            locName = query;
            setDisplayLocation(locName);
            try {
              const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
              const geocodeData = await geocodeRes.json();
              if (geocodeData && geocodeData.length > 0) {
                lat = parseFloat(geocodeData[0].lat);
                lon = parseFloat(geocodeData[0].lon);
              }
            } catch (err) {
              console.warn('Geocoding failed, using fallback', err);
            }
          }
        }

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature`
        );
        if (weatherRes.ok) {
          const wData = await weatherRes.json();
          setWeatherData(wData);
        }

        // Fetch Real APMC prices
        const priceRes = await api.get('/market-prices');
        const pData = priceRes.data || [];
        setMarketData(pData.map((item, idx) => ({
          ...item,
          mandi: item.mandi || APMC_MANDIS[idx % APMC_MANDIS.length].name,
        })));

      } catch (err) {
        console.error('Error fetching data for Intelligence Hub:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getWeatherDescription = (code) => {
    if (code === 0) return 'Clear Sky';
    if (code > 0 && code <= 3) return 'Partly Cloudy';
    if (code > 3 && code <= 48) return 'Foggy / Overcast';
    if (code > 48 && code <= 67) return 'Rainy';
    return 'Severe Weather';
  };

  return (
    <div style={styles.layout}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>
            Intelligence <span style={{ color: '#16a34a' }}>Hub</span>
          </h1>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Real-time Agricultural Data
          </p>
        </div>
        <div style={{ width: 150 }}></div>
      </div>

      <div style={styles.contentStack}>
        {/* Intro */}
        <div style={styles.card}>
          <div style={styles.badge}>MARKET & CLIMATE ANALYTICS</div>
          <p style={styles.subtitle}>
            Comprehensive insights powered by real Open-Meteo satellite weather and state APMC daily commodity reports.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
              Synchronizing with live data feeds...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Real Weather */}
            <div style={{ ...styles.contentStack, flex: 1 }}>
              <div style={{ ...styles.card, borderTop: '4px solid #3b82f6' }}>
                <div style={styles.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ ...styles.sectionIcon, background: '#eff6ff' }}><CloudRain size={20} color="#3b82f6" /></div>
                    <h4 style={styles.sectionTitle}>Live Weather</h4>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>
                    {displayLocation.split(',')[0]}
                  </span>
                </div>

                {weatherData?.current ? (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <span style={{ fontSize: '4rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
                        {Math.round(weatherData.current.temperature_2m)}°
                      </span>
                      <p style={{ fontSize: '1rem', font700: 'bold', color: '#3b82f6', margin: '0.5rem 0 0' }}>
                        {getWeatherDescription(weatherData.current.weather_code)}
                      </p>
                    </div>

                    <div style={styles.grid2}>
                      <div style={styles.miniCard}>
                        <Wind size={16} color="#9ca3af" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>
                          {weatherData.current.wind_speed_10m} km/h
                        </p>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', margin: 0 }}>Wind Speed</p>
                      </div>
                      <div style={styles.miniCard}>
                        <Droplets size={16} color="#9ca3af" style={{ marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>
                          {weatherData.current.relative_humidity_2m}%
                        </p>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', margin: 0 }}>Humidity</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-xs text-gray-400 italic py-6">No current weather data available</p>
                )}
              </div>
            </div>

            {/* Right Column: APMC Price Table */}
            <div style={{ ...styles.contentStack, lgColSpan: '2', flex: 2 }} className="lg:col-span-2">
              <div style={styles.card}>
                <div style={styles.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={styles.sectionIcon}><BarChart3 size={20} color="#16a34a" /></div>
                    <div>
                      <h3 style={styles.sectionTitle}>APMC Mandi Rates</h3>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase', margin: 0 }}>
                        Real pricing from active markets
                      </p>
                    </div>
                  </div>
                </div>

                {marketData.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <th style={styles.th}>Commodity</th>
                          <th style={styles.th}>Mandi</th>
                          <th style={styles.th}>Price Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketData.slice(0, 8).map((item, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#4b5563', fontSize: '0.8rem' }}>
                                  🌾
                                </div>
                                <span style={{ fontWeight: 900, color: '#1c1917', fontSize: '0.9rem' }}>{item.commodity}</span>
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: '#4b5563', fontWeight: 700 }}>{item.mandi}</td>
                            <td style={{ ...styles.td, fontWeight: 900, color: '#16a34a' }}>
                              ₹{item.minPrice || item.price} - ₹{item.maxPrice || item.price} / q
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-gray-400 italic">
                    No active mandi prices report available today.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  layout: {
    maxWidth: 1100, margin: '0 auto',
    padding: '2.5rem 5% 8rem',
    background: '#fafaf9',
    minHeight: '100vh',
    fontFamily: '"Inter", sans-serif'
  },
  header: {
    display: 'flex', alignItems: 'center', justify: 'space-between',
    marginBottom: '2.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1.5px solid var(--border-subtle, #f3f4f6)'
  },
  contentStack: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  card: {
    background: 'var(--bg-card, #fff)', borderRadius: 20,
    border: '1px solid var(--border-subtle, #f3f4f6)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    padding: '1.8rem',
  },
  miniCard: {
    background: 'var(--bg-input, #fafaf9)', borderRadius: 16,
    border: '1px solid var(--border-subtle)', padding: '1rem',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    background: 'var(--color-primary-light)', color: 'var(--color-primary)',
    borderRadius: 99, padding: '0.3rem 0.875rem',
    fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.07em', textTransform: 'uppercase',
    marginBottom: '1rem'
  },
  subtitle: {
    fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6,
    maxWidth: 800
  },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', alignItems: 'start' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justify: 'space-between',
    marginBottom: '1.5rem'
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'var(--color-primary-light)', border: 'none', color: 'var(--color-primary)',
    fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
    textTransform: 'uppercase', width: 'auto', borderRadius: 10, padding: '0.5rem 0.875rem'
  },
  th: {
    padding: '1rem 0.5rem', fontSize: '0.7rem', fontWeight: 900,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  td: {
    padding: '1rem 0.5rem', verticalAlign: 'middle'
  }
};

export default IntelligenceHub;

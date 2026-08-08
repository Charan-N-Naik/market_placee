import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, CloudSun, TrendingUp, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../LanguageToggle';
import api from '../../api/axios';

export default function Navbar({
  activeTab,
  navItems,
  setSidebarOpen,
  role,
  topBarExtra,
  user
}) {
  const isFarmer = role === 'farmer';
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [navWeather, setNavWeather] = useState(null);
  const [navPrice, setNavPrice] = useState(null);

  useEffect(() => {
    if (isFarmer) {
      api.get('/notifications/unread/count')
        .then(res => setUnreadCount(res.data?.count || res.data || 0))
        .catch(() => {});
    }
  }, [isFarmer, activeTab]);

  useEffect(() => {
    if (isFarmer) {
      // Fetch dynamic weather
      fetch('https://api.open-meteo.com/v1/forecast?latitude=13.34&longitude=77.10&current_weather=true')
        .then(res => res.json())
        .then(data => {
          if (data?.current_weather) {
            setNavWeather(`${Math.round(data.current_weather.temperature)}°C`);
          }
        })
        .catch(() => {});

      // Fetch dynamic APMC market price
      api.get('/market-prices')
        .then(res => {
          const prices = res.data || [];
          if (prices.length > 0) {
            const first = prices[0];
            setNavPrice(`${first.commodity || 'Crops'} ₹${first.modalPrice || first.price || '—'}/kg`);
          }
        })
        .catch(() => {});
    }
  }, [isFarmer]);

  // Non-farmer navbar (buyer — keep original)
  if (!isFarmer) {
    const currentItem = navItems?.find(item => item.id === activeTab);
    const Icon = currentItem?.icon;
    return (
      <header style={{
        background: 'var(--bg-card, #fff)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 1.5rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"
            style={{ background: 'var(--color-primary-light)', border: 'none', borderRadius: 10, padding: '0.5rem', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {Icon && (
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
            )}
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, lineHeight: 1, textTransform: 'capitalize' }}>
                {currentItem?.label || activeTab}
              </h2>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Buyer Hub / {activeTab}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--color-primary)', color: 'white', fontWeight: 900, fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}>
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : ((user?.name?.charAt(0) || role.charAt(0)).toUpperCase())}
          </div>
          {topBarExtra && topBarExtra}
        </div>
      </header>
    );
  }

  // ====== FARMER NAVBAR ======
  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4e4e7',
      padding: '0 1.5rem', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Left: Hamburger + Welcome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden"
          style={{
            background: '#f4f4f5', border: 'none', borderRadius: 8, padding: '0.5rem',
            cursor: 'pointer', color: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 style={{
            fontSize: '0.95rem', fontWeight: 700, color: '#18181b', margin: 0, lineHeight: 1.2,
          }}>
            Welcome back, <span style={{ color: '#166534' }}>{user?.name?.split(' ')[0] || 'Farmer'}</span> 👋
          </h2>
          <p style={{
            fontSize: '0.65rem', fontWeight: 500, color: '#71717a', margin: '2px 0 0',
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Right: Widgets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Govt Schemes Quick Access Widget */}
        <button 
          onClick={() => navigate('/schemes')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-[#E8F7EE] hover:bg-[#1F7A4D] hover:text-white text-xs font-black text-[#1F7A4D] transition-all cursor-pointer shadow-xs"
        >
          <span className="text-sm">🏛️</span>
          <span>Govt Schemes</span>
        </button>

        {/* Minimal Weather Widget */}
        <button 
          onClick={() => navigate('/weather')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <CloudSun size={15} className="text-[#22C55E]" />
          <span>{navWeather || 'Loading...'}</span>
          <span className="text-[10px] text-gray-400 font-normal">| View Weather</span>
        </button>

        {/* Minimal Market Price Widget */}
        <button 
          onClick={() => navigate('/market-prices')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <TrendingUp size={14} className="text-[#22C55E]" />
          <span>{navPrice || 'Loading...'}</span>
          <span className="text-[10px] text-gray-400 font-normal">| View Prices</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => {/* Could navigate to notifications tab */}}
          style={{
            position: 'relative', background: '#ffffff', border: '1px solid #e4e4e7',
            borderRadius: 8, padding: '0.5rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Bell size={18} color="#71717a" />
          {unreadCount > 0 && (
            <span className="notif-dot" style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%',
              background: '#ef4444', color: 'white',
              fontSize: '0.55rem', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Language Toggle (compact) */}
        <div className="hidden sm:block">
          <LanguageToggle />
        </div>

        {/* Profile Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: 'linear-gradient(135deg, #22C55E, #166534)',
          color: 'white', fontWeight: 900, fontSize: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer', border: '1px solid #e4e4e7',
        }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user?.name?.charAt(0) || 'F').toUpperCase()
          )}
        </div>

        {topBarExtra && topBarExtra}
      </div>
    </header>
  );
}

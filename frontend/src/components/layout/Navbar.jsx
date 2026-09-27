import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, CloudSun, TrendingUp, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../LanguageToggle';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Format a raw DB name into a clean, capitalized display name (e.g. former1 -> Former 1)
function formatDisplayName(rawName) {
  if (!rawName) return '';
  let n = String(rawName)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim();
  return n.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function Navbar({
  activeTab,
  navItems,
  setSidebarOpen,
  setActiveTab,
  role,
  topBarExtra,
  user
}) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;
  const isFarmer = role === 'farmer';
  const { t } = useTranslation();
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
            const rawName = first.commodity || first.name || 'Crops';
            const rawVal = first.modalPrice ?? first.modal_price ?? first.price ?? '—';
            // Clean out any duplicate ₹ or /kg
            const cleanDigits = String(rawVal).replace(/[₹\s]|Rs\.?|\/kg/gi, '').trim();
            const priceFormatted = cleanDigits ? `₹${cleanDigits}/kg` : (String(rawVal).startsWith('₹') ? rawVal : `₹${rawVal}`);
            setNavPrice(`${rawName} ${priceFormatted}`);
          }
        })
        .catch(() => {});
    }
  }, [isFarmer]);

  // Non-farmer navbar (buyer)
  if (!isFarmer) {
    const currentItem = navItems?.find(item => item.id === activeTab);
    const Icon = currentItem?.icon;
    return (
      <header style={{
        background: 'var(--bg-card, #fff)',
        borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        padding: '0 1.5rem', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"
            style={{ background: 'var(--color-primary-light, #fef3c7)', border: 'none', borderRadius: 10, padding: '0.5rem', cursor: 'pointer', color: 'var(--color-primary, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {Icon && (
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fff7ed', border: '1px solid #ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} style={{ color: '#ea580c' }} />
              </div>
            )}
            <div>
              <h2 style={{
                fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '1.05rem', fontWeight: 800, color: '#1c1917', margin: 0, lineHeight: 1.25,
                letterSpacing: '-0.01em'
              }}>
                {t('navbar.welcomeBack', 'Welcome,')} <span style={{ color: '#ea580c', fontWeight: 800 }}>{formatDisplayName(currentUser?.name) || 'Buyer'}</span> 👋
              </h2>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '0.68rem', fontWeight: 700, color: '#78716c', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>
                {role === 'delivery_agent' || role === 'delivery' ? 'Delivery Agent Hub' : t('navbar.buyerHubBreadcrumb', 'Buyer Hub')} / {currentItem?.label || activeTab}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Buyer Profile Avatar Button — click to go to profile tab */}
          <button
            onClick={() => setActiveTab?.('profile')}
            title="View Buyer Profile"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #ea580c, #c2410c)',
              color: 'white', fontWeight: 900, fontSize: '1.05rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: 0,
              cursor: 'pointer', border: '2px solid transparent',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 10px rgba(234,88,12,0.25)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(234,88,12,0.25)'; }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (formatDisplayName(currentUser?.name)?.charAt(0) || 'B').toUpperCase()
            )}
          </button>
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
            fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: '1.05rem', fontWeight: 700, color: '#18181b', margin: 0, lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}>
            {t('navbar.welcomeBack')} <span style={{ color: '#15803d', fontWeight: 800 }}>{formatDisplayName(currentUser?.name) || 'Farmer'}</span> 👋
          </h2>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: '0.68rem', fontWeight: 600, color: '#71717a', margin: '3px 0 0',
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
          <span>{t('navbar.govtSchemes')}</span>
        </button>

        {/* Minimal Weather Widget */}
        <button 
          onClick={() => navigate('/weather')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <CloudSun size={15} className="text-[#22C55E]" />
          <span>{navWeather || 'Loading...'}</span>
          <span className="text-[10px] text-gray-400 font-normal">| {t('navbar.viewWeather')}</span>
        </button>

        {/* Minimal Market Price Widget */}
        <button 
          onClick={() => navigate('/market-prices')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <TrendingUp size={14} className="text-[#22C55E]" />
          <span>{navPrice || 'Loading...'}</span>
          <span className="text-[10px] text-gray-400 font-normal">| {t('navbar.viewPrices')}</span>
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

        {/* Profile Avatar — click to go to Profile tab */}
        <button
          onClick={() => setActiveTab?.('profile')}
          title="View Profile"
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #22C55E, #166534)',
            color: 'white', fontWeight: 900, fontSize: '1.05rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', padding: 0,
            cursor: 'pointer', border: '2px solid transparent',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(22,101,52,0.22)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#166534'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(22,101,52,0.22)'; }}
        >
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (formatDisplayName(currentUser?.name)?.charAt(0) || 'F').toUpperCase()
          )}
        </button>

        {topBarExtra && topBarExtra}
      </div>
    </header>
  );
}

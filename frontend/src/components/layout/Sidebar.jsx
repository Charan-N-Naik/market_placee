import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../LanguageToggle';
import api from '../../api/axios';
import {
  X, LogOut, ChevronRight, ChevronLeft,
  LayoutDashboard, Package, Plus, ShoppingCart, Warehouse, BarChart3,
  Bot, ScanEye, CloudSun, TrendingUp, Landmark,
  Bell, User, Settings,
  Leaf, BookmarkCheck, Bookmark, ShoppingBag, Heart, Sprout
} from 'lucide-react';

// Format raw DB username into clean display name (e.g. former1 -> Former 1)
function formatDisplayName(rawName) {
  if (!rawName) return '';
  return String(rawName)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Sidebar({
  user,
  onLogout,
  navItems,
  activeTab,
  setActiveTab,
  role,
  sidebarOpen,
  setSidebarOpen
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isFarmer = role === 'farmer';
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count for farmers
  useEffect(() => {
    if (isFarmer) {
      api.get('/notifications/unread/count')
        .then(res => setUnreadCount(res.data?.count || res.data || 0))
        .catch(() => setUnreadCount(0));
    }
  }, [isFarmer, activeTab]);

  // Farmer-specific menu with sections
  const farmerSections = [
    {
      label: t('sidebar.main'),
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
        { id: 'listings', icon: Package, label: t('sidebar.myListings') },
        { id: 'add', icon: Plus, label: t('sidebar.addNewCrop') },
        { id: 'orders', icon: ShoppingCart, label: t('sidebar.orders') },
        { id: 'analytics', icon: BarChart3, label: t('sidebar.analytics') },
        { id: 'schemes', icon: Landmark, label: t('sidebar.govSchemes'), external: '/schemes' },
      ]
    },
    {
      label: t('sidebar.aiTools'),
      items: [
        { id: 'assistant', icon: Bot, label: t('sidebar.aiAssistant'), badge: 'AI' },
        { id: 'analyzer', icon: ScanEye, label: t('sidebar.cropVerification'), badge: 'AI' },
        { id: 'weather', icon: CloudSun, label: t('sidebar.weather'), external: '/weather' },
        { id: 'market', icon: TrendingUp, label: t('sidebar.marketPrices'), external: '/market-prices' },
      ]
    },
    {
      label: t('sidebar.account'),
      items: [
        { id: 'notifications', icon: Bell, label: t('sidebar.notifications'), count: unreadCount },
        { id: 'profile', icon: User, label: t('sidebar.profile') },
        { id: 'settings', icon: Settings, label: t('sidebar.settings') },
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (item.external) {
      navigate(item.external);
    } else {
      setActiveTab(item.id);
    }
    setSidebarOpen(false);
  };

  // Non-farmer: previous clean buyer sidebar layout
  if (!isFarmer) {
    return (
      <>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed md:relative inset-y-0 left-0 z-50 w-[272px] h-full flex flex-col
            transform transition-transform duration-300 ease-out md:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{
            background: 'var(--bg-card, #fff)',
            borderRight: '1px solid var(--border-subtle, #f3f4f6)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.04)'
          }}
        >
          {/* Logo Header */}
          <div style={{
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--color-primary-light, #E8F7EE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(31,122,77,0.15)'
              }}>
                <Sprout size={22} style={{ color: 'var(--color-primary, #1F7A4D)' }} />
              </div>
              <div>
                <h1 style={{
                  fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-main, #1c1917)',
                  margin: 0, lineHeight: 1, letterSpacing: '-0.03em'
                }}>
                  Kisan<span style={{ color: 'var(--color-primary, #1F7A4D)' }}>Bazaar</span>
                </h1>
                <p style={{
                  fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-primary, #1F7A4D)',
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '3px 0 0'
                }}>
                  🚚 {role === 'delivery_agent' || role === 'delivery' ? 'Delivery Agent Hub' : `🍃 ${t('sidebar.buyerHub')}`}
                </p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          {/* User Profile Card */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)' }}>
            <div style={{
              background: 'var(--color-primary-light, #E8F7EE)', borderRadius: 14, padding: '0.75rem 0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div 
                onClick={() => { setActiveTab?.('profile'); setSidebarOpen?.(false); }}
                title={t('navbar.viewProfile', 'View Profile')}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--color-primary, #1F7A4D)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1rem', overflow: 'hidden',
                  flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,122,77,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDisplayName(user?.name) || user?.name || 'User'}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a3e635', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {typeof user?.location === 'object'
                    ? `${user?.location?.district || user?.location?.address || 'Karnataka'}, ${user?.location?.state || 'IN'}`
                    : (user?.location || 'Karnataka')}
                </p>

              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ flex: 1, padding: '0.75rem 0.875rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} id={`nav-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 0.875rem', borderRadius: 12,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'var(--color-primary-light, #E8F7EE)' : 'transparent',
                    color: isActive ? 'var(--color-primary, #1F7A4D)' : 'var(--text-main, #1c1917)',
                    fontWeight: isActive ? 800 : 600, fontSize: '0.85rem',
                    transition: 'all 0.2s ease', position: 'relative'
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(34,197,94,0.2)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a3bfa8'; } }}
                >
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 4, background: 'var(--color-primary, #1F7A4D)' }} />}
                  {Icon && <Icon size={18} style={{ color: isActive ? 'var(--color-primary, #1F7A4D)' : 'var(--text-muted, #78716c)', flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.45rem', borderRadius: 99, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'linear-gradient(to right, #7c3aed, #3b82f6)', color: '#fff', boxShadow: '0 0 4px rgba(124,58,237,0.5)' }}>{item.badge}</span>
                  )}
                  {isActive && <ChevronRight size={14} style={{ color: 'var(--color-primary, #1F7A4D)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>

          {/* Footer Controls */}
          <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ background: '#1F7A4D', borderRadius: '9999px', border: '1px solid #2d6a4f', padding: '0.25rem 0.5rem', display: 'flex', justifyContent: 'center', transition: 'background 0.2s' }}>
  <LanguageToggle className="w-full justify-center" />
</div>
            <button id="btn-logout" onClick={onLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '9999px', color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={15} />{t('common.logout')}
            </button>
          </div>
        </aside>
      </>
    );
  }

  // ====== FARMER LIGHT GREEN SIDEBAR ======
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Spacer for desktop to prevent overlap while sidebar is fixed */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ease-out ${collapsed ? 'w-[72px]' : 'w-[272px]'}`} />

      <aside
        className={`farmer-sidebar fixed inset-y-0 left-0 z-50 h-full flex flex-col
          transform transition-all duration-300 ease-out md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-[72px]' : 'w-[272px]'}`}
        style={{
          background: 'linear-gradient(to bottom, #e8f5e9, #dcedc8)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo Header */}
        <div style={{
          padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(21,128,61,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 68,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(21,128,61,0.15)'
              }}>
                <Sprout size={22} style={{ color: '#2e7d32' }} />
              </div>
              <div>
                <h1 style={{
                  fontWeight: 900, fontSize: '1.2rem', color: '#1b5e20',
                  margin: 0, lineHeight: 1, letterSpacing: '-0.02em'
                }}>
                  Kisan<span style={{ color: '#2e7d32' }}>Bazaar</span>
                </h1>
                <p style={{
                  fontSize: '0.55rem', fontWeight: 700, color: '#558b2f',
                  textTransform: 'uppercase', letterSpacing: '0.15em', margin: '3px 0 0'
                }}>{t('sidebar.farmerPortal')}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(21,128,61,0.15)'
            }}>
              <Sprout size={22} style={{ color: '#2e7d32' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b8e6b' }}>
              <X size={18} />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex"
              style={{
                background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(21,128,61,0.12)',
                cursor: 'pointer', color: '#4a7c59',
                borderRadius: 8, padding: '0.35rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
              <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
          </div>
        </div>

        {/* User Card */}
        {!collapsed && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(21,128,61,0.12)' }}>
            <div style={{
              background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: '0.875rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              border: '1px solid rgba(21,128,61,0.1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div 
                onClick={() => { setActiveTab?.('profile'); setSidebarOpen?.(false); }}
                title={t('navbar.viewProfile', 'View Profile')}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22C55E, #16a34a)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1rem', overflow: 'hidden',
                  flexShrink: 0, border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (user?.name?.charAt(0)?.toUpperCase() || 'F')}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1b5e20', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDisplayName(user?.name) || user?.name || 'Farmer'}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#558b2f', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {typeof user?.location === 'object'
                    ? `${user?.location?.district || user?.location?.address || 'India'}, ${user?.location?.state || 'KA'}`
                    : (user?.location || 'India')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="farmer-sidebar" style={{
          flex: 1, padding: collapsed ? '0.75rem 0.5rem' : '0.5rem 0.75rem',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          {farmerSections.map((section, si) => (
            <div key={section.label}>
              {!collapsed && (
                <p style={{
                  fontSize: '0.55rem', fontWeight: 800, color: '#4a7c59',
                  textTransform: 'uppercase', letterSpacing: '0.2em',
                  padding: si === 0 ? '0.5rem 0.875rem 0.4rem' : '1rem 0.875rem 0.4rem',
                  margin: 0,
                }}>{section.label}</p>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: 'rgba(21,128,61,0.1)', margin: '0.5rem 0.25rem' }} />
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} id={`nav-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: collapsed ? 0 : '0.75rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '0.75rem' : '0.7rem 0.875rem',
                      borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? 'rgba(255,255,255,0.85)' : 'transparent',
                      color: isActive ? '#1b5e20' : '#2e5a3a',
                      fontWeight: isActive ? 800 : 600, fontSize: '0.85rem',
                      boxShadow: isActive ? '0 2px 12px rgba(34,197,94,0.35), 0 0 0 1px rgba(255,255,255,0.5)' : 'none',
                      transition: 'all 0.2s ease', position: 'relative', margin: '1px 0',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; e.currentTarget.style.color = '#1b5e20'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2e5a3a'; } }}
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 4, borderRadius: 99, background: '#1b5e20', boxShadow: '0 0 8px rgba(27,94,32,0.5)' }} />}
                    <Icon size={18} style={{ color: isActive ? '#1b5e20' : '#4a7c59', flexShrink: 0 }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span style={{
                            fontSize: '0.55rem', padding: '0.1rem 0.45rem', borderRadius: 99,
                            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: 'linear-gradient(to right, #7c3aed, #3b82f6)',
                            color: '#fff',
                            boxShadow: '0 0 6px rgba(124,58,237,0.5)',
                          }}>{item.badge}</span>
                        )}
                        {item.count > 0 && (
                          <span className="notif-dot" style={{
                            fontSize: '0.6rem', minWidth: 20, height: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 99, fontWeight: 800, background: '#ef4444', color: '#fff',
                          }}>{item.count > 99 ? '99+' : item.count}</span>
                        )}
                        {isActive && <ChevronRight size={14} style={{ color: '#2e7d32', flexShrink: 0 }} />}
                      </>
                    )}
                    {collapsed && item.count > 0 && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                        borderRadius: '50%', background: '#ef4444', border: '2px solid #a5d6a7',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: collapsed ? '0.75rem' : '1rem 1.25rem',
          borderTop: '1px solid rgba(21,128,61,0.12)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {!collapsed && (
            <div style={{ background: '#fff', borderRadius: 99, border: '1px solid rgba(21,128,61,0.12)', padding: '0.25rem 0.5rem', display: 'flex', justifyContent: 'center', transition: 'background 0.2s' }}>
              <LanguageToggle className="w-full justify-center" />
            </div>
          )}
          <button id="btn-logout" onClick={onLogout} title={collapsed ? 'Logout' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: collapsed ? 0 : '0.5rem', padding: '0.7rem',
              background: '#fff0f0', border: '1px solid #fecaca',
              borderRadius: 99, color: '#dc2626', fontWeight: 800,
              fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; }}
          >
            <LogOut size={15} />{!collapsed && t('common.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}

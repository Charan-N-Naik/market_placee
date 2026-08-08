import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../LanguageToggle';
import api from '../../api/axios';
import {
  X, LogOut, ChevronRight, ChevronLeft,
  LayoutDashboard, Package, Plus, ShoppingCart, Warehouse, BarChart3,
  Bot, ScanEye, CloudSun, TrendingUp, Landmark,
  Bell, User, Settings,
  Leaf, BookmarkCheck, Bookmark, ShoppingBag, Heart
} from 'lucide-react';

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
  const { t } = useLanguage();
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
      label: 'MAIN',
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'listings', icon: Package, label: 'My Listings' },
        { id: 'add', icon: Plus, label: 'Add New Crop' },
        { id: 'orders', icon: ShoppingCart, label: 'Orders' },
        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
        { id: 'schemes', icon: Landmark, label: 'Gov Schemes', external: '/schemes' },
      ]
    },
    {
      label: 'AI TOOLS',
      items: [
        { id: 'assistant', icon: Bot, label: 'AI Assistant', badge: 'AI' },
        { id: 'analyzer', icon: ScanEye, label: 'Crop Verification', badge: 'AI' },
        { id: 'weather', icon: CloudSun, label: 'Weather', external: '/weather' },
        { id: 'market', icon: TrendingUp, label: 'Market Prices', external: '/market-prices' },
      ]
    },
    {
      label: 'ACCOUNT',
      items: [
        { id: 'notifications', icon: Bell, label: 'Notifications', count: unreadCount },
        { id: 'profile', icon: User, label: 'Profile' },
        { id: 'settings', icon: Settings, label: 'Settings' },
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
                fontSize: '1.2rem'
              }}>🛒</div>
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
                }}>🛒 Buyer Hub</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          {/* User Profile Card */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              background: 'var(--color-primary-light, #E8F7EE)', borderRadius: 14, padding: '0.75rem 0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--color-primary, #1F7A4D)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1rem', overflow: 'hidden',
                flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {typeof user?.location === 'object'
                    ? `${user?.location?.district || user?.location?.address || 'Karnataka'}, ${user?.location?.state || 'IN'}`
                    : (user?.location || 'Karnataka')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#1F7A4D', background: '#ffffff', padding: '1px 6px', borderRadius: 99, border: '1px solid #1F7A4D33' }}>
                    🟢 Live
                  </span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#6b7280' }}>🌡 28°C</span>
                </div>
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
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--border-subtle, #E8F7EE)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 4, background: 'var(--color-primary, #1F7A4D)' }} />}
                  {Icon && <Icon size={18} style={{ color: isActive ? 'var(--color-primary, #1F7A4D)' : 'var(--text-muted, #78716c)', flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '0.55rem', padding: '0.15rem 0.45rem', borderRadius: 99, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: isActive ? 'var(--color-primary, #1F7A4D)' : 'var(--color-primary-light, #E8F7EE)', color: isActive ? 'white' : 'var(--color-primary, #1F7A4D)' }}>{item.badge}</span>
                  )}
                  {isActive && <ChevronRight size={14} style={{ color: 'var(--color-primary, #1F7A4D)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>

          {/* Footer Controls */}
          <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <LanguageToggle className="w-full justify-center" />
            <button id="btn-logout" onClick={onLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', background: 'none', border: '1.5px solid #fee2e2', borderRadius: 12, color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={15} />{t('logout') || 'Logout'}
            </button>
          </div>
        </aside>
      </>
    );
  }

  // ====== FARMER DARK GREEN SIDEBAR ======
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
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
          background: 'var(--sidebar-bg, linear-gradient(180deg, #14532d, #166534, #15803d))',
          boxShadow: '4px 0 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo Header */}
        <div style={{
          padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.5rem',
          borderBottom: '1px solid var(--sidebar-divider)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 68,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(34,197,94,0.3)'
              }}>
                <Leaf size={20} color="#22C55E" />
              </div>
              <div>
                <h1 style={{
                  fontWeight: 900, fontSize: '1.2rem', color: '#fff',
                  margin: 0, lineHeight: 1, letterSpacing: '-0.02em'
                }}>
                  Kisan<span style={{ color: '#22C55E' }}>Bazaar</span>
                </h1>
                <p style={{
                  fontSize: '0.55rem', fontWeight: 700, color: 'rgba(132,204,22,0.8)',
                  textTransform: 'uppercase', letterSpacing: '0.15em', margin: '3px 0 0'
                }}>Farmer Portal</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(34,197,94,0.3)'
            }}>
              <Leaf size={20} color="#22C55E" />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
              <X size={18} />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex"
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                borderRadius: 8, padding: '0.35rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
              <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
          </div>
        </div>

        {/* User Card */}
        {!collapsed && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--sidebar-divider)' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.875rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #22C55E, #16a34a)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1rem', overflow: 'hidden',
                flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (user?.name?.charAt(0)?.toUpperCase() || 'F')}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Farmer'}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(132,204,22,0.8)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  fontSize: '0.6rem', fontWeight: 800, color: 'var(--sidebar-section-label)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                  padding: si === 0 ? '0.5rem 0.875rem 0.4rem' : '1rem 0.875rem 0.4rem',
                  margin: 0,
                }}>{section.label}</p>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: 'var(--sidebar-divider)', margin: '0.5rem 0.25rem' }} />
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
                      borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                      transition: 'all 0.2s ease', position: 'relative', margin: '1px 0',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, borderRadius: 4, background: '#22C55E' }} />}
                    <Icon size={18} style={{ color: isActive ? '#22C55E' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span style={{
                            fontSize: '0.55rem', padding: '0.1rem 0.45rem', borderRadius: 99,
                            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: isActive ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.2)',
                            color: isActive ? '#22C55E' : '#a78bfa',
                          }}>{item.badge}</span>
                        )}
                        {item.count > 0 && (
                          <span className="notif-dot" style={{
                            fontSize: '0.6rem', minWidth: 20, height: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 99, fontWeight: 800, background: '#ef4444', color: '#fff',
                          }}>{item.count > 99 ? '99+' : item.count}</span>
                        )}
                        {isActive && <ChevronRight size={14} style={{ color: '#22C55E', flexShrink: 0 }} />}
                      </>
                    )}
                    {collapsed && item.count > 0 && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                        borderRadius: '50%', background: '#ef4444', border: '2px solid #166534',
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
          borderTop: '1px solid var(--sidebar-divider)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {!collapsed && <LanguageToggle className="w-full justify-center" />}
          <button id="btn-logout" onClick={onLogout} title={collapsed ? 'Logout' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: collapsed ? 0 : '0.5rem', padding: '0.7rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, color: '#fca5a5', fontWeight: 800,
              fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            <LogOut size={15} />{!collapsed && (t('logout') || 'Logout')}
          </button>
        </div>
      </aside>
    </>
  );
}

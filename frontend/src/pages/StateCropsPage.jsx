import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useListings } from '../context/ListingContext';
import { useCart } from '../context/CartContext';
import CropCard from '../components/CropCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import DashboardLayout from '../components/DashboardLayout';
import {
  Search, Heart, Bot, Eye, User,
  ShoppingBag, ShoppingCart, ArrowLeft, MapPin
} from 'lucide-react';
import { cropOptions } from '../data/mockData';

export default function StateCropsPage() {
  const navigate = useNavigate();
  const { stateName } = useParams();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { listings, toggleSaved, isSaved } = useListings();
  const { cartItemsCount } = useCart();

  const [loading, setLoading] = useState(true);
  const [filterCrop, setFilterCrop] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/login/buyer');
      return;
    }
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { id: 'browse', icon: Search, label: t('browseListings') || 'Browse Crops', path: '/buyer/dashboard' },
    { id: 'cart', icon: ShoppingCart, label: `Cart${cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}`, path: '/cart' },
    { id: 'profile', icon: User, label: t('profile') || 'My Profile', path: '/buyer/dashboard' },
  ];

  // Decode the URL param just in case
  const decodedStateName = decodeURIComponent(stateName || '');

  // Define known districts for states to improve matching if the DB only stores district names
  const stateDistricts = {
    'Karnataka': ['ramanagara', 'tumkur', 'hassan', 'gadag', 'mandya', 'kolar', 'mysuru', 'bengaluru', 'belgaum', 'dharwad', 'shimoga', 'davangere', 'chitradurga', 'bellary', 'raichur', 'haveri'],
    'Maharashtra': ['pune', 'nashik', 'nagpur', 'satara', 'solapur'],
    'Punjab': ['ludhiana', 'amritsar', 'jalandhar', 'patiala'],
    'Gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot'],
    'Uttar Pradesh': ['lucknow', 'kanpur', 'agra', 'varanasi']
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const isVerified = l.aiVerified || l.isVerified || l.status === 'active';
      if (!isVerified) return false;
      
      // location logic
      const locString = typeof l.location === 'object'
        ? `${l.location?.address || ''} ${l.location?.district || ''} ${l.location?.state || ''}`.toLowerCase()
        : (l.location || '').toLowerCase();
        
      // Match state name
      const targetState = decodedStateName.toLowerCase();
      const stateKeywords = stateDistricts[decodedStateName] || [];
      const matchesState = locString.includes(targetState) || stateKeywords.some(d => locString.includes(d));
      
      if (!matchesState) return false;

      const matchesCrop = filterCrop ? l.cropName?.toLowerCase() === filterCrop.toLowerCase() : true;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery ? (
        l.cropName?.toLowerCase().includes(searchLower) ||
        (l.variety && l.variety.toLowerCase().includes(searchLower)) ||
        (l.farmer?.name && l.farmer.name.toLowerCase().includes(searchLower)) ||
        locString.includes(searchLower)
      ) : true;
      
      return matchesCrop && matchesSearch;
    });
  }, [listings, decodedStateName, filterCrop, searchQuery]);

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      navItems={navItems}
      activeTab=""
      setActiveTab={(tab) => {
         const nav = navItems.find(n => n.id === tab);
         if (nav && nav.path) navigate(nav.path);
      }}
      role="buyer"
      topBarExtra={
        <button
          onClick={() => navigate('/cart')}
          style={{
            position: 'relative', padding: '0.6rem',
            background: '#fffbf1', color: '#d97706',
            borderRadius: '50%', border: '1px solid #fde68a',
            cursor: 'pointer'
          }}
          title="View Cart"
        >
          <ShoppingCart size={18} />
          {cartItemsCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 900,
              borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {cartItemsCount}
            </span>
          )}
        </button>
      }
    >
      <div style={styles.layout}>
        
        {/* Back navigation */}
        <button onClick={() => navigate('/buyer/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={styles.contentStack}>
          {/* Header */}
          <div style={styles.card}>
            <div style={styles.badge}>REGIONAL CROPS</div>
            <h3 style={styles.pageTitle}>
              <span style={{ color: '#d97706' }}>{decodedStateName}</span> Harvest
            </h3>
            <p style={styles.subtitle}>
              Showing all available harvest stocks from verified farmers in {decodedStateName}.
            </p>
          </div>

          {/* Filters */}
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={styles.sectionIcon}><Search size={18} color="#1c1917" /></div>
                <h4 style={styles.sectionTitle}>State Search</h4>
              </div>
            </div>
            <div style={styles.grid2}>
              <div>
                <label style={styles.inputLabel}>Search Query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search crops or farmers..."
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.inputLabel}>Filter Crop</label>
                <select
                  value={filterCrop}
                  onChange={(e) => setFilterCrop(e.target.value)}
                  style={styles.input}
                >
                  <option value="">All Crops</option>
                  {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <span style={styles.resultsLabel}>
                Found {filteredListings.length} Active Stocks
              </span>
            </div>

            {loading ? (
              <div style={styles.grid3}><LoadingSkeleton count={3} /></div>
            ) : filteredListings.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>📍</div>
                <h4 style={styles.emptyTitle}>No crops found in {decodedStateName}</h4>
                <p style={styles.emptySub}>Try checking back later or adjusting your filters.</p>
              </div>
            ) : (
              <div style={styles.grid3}>
                {filteredListings.map((listing) => (
                  <div key={listing._id || listing.id} style={{ transition: 'transform 0.2s' }}>
                    <CropCard
                      listing={{
                        ...listing,
                        onToggleSave: toggleSaved,
                        isSaved: isSaved(listing._id || listing.id)
                      }}
                      showContact={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const styles = {
  layout: {
    maxWidth: 1100, margin: '0 auto',
    padding: '2.5rem 5% 8rem',
  },
  contentStack: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  card: {
    background: '#fff', borderRadius: 20,
    border: '1.5px solid #f3f4f6',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    padding: '1.8rem',
  },
  badge: {
    display: 'inline-block',
    background: '#fef3c7', color: '#d97706',
    borderRadius: 99, padding: '0.3rem 0.8rem',
    fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
    marginBottom: '1rem'
  },
  pageTitle: {
    fontSize: '2rem', fontWeight: 900, color: '#1c1917', margin: '0 0 0.5rem',
    letterSpacing: '-0.03em'
  },
  subtitle: {
    fontSize: '0.95rem', color: '#57534e', margin: 0, lineHeight: 1.5,
    maxWidth: 600
  },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.5rem'
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10, background: '#f5f5f4',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 800, color: '#1c1917', margin: 0 },
  inputLabel: {
    display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#78716c',
    textTransform: 'uppercase', marginBottom: '0.5rem'
  },
  input: {
    width: '100%', padding: '0.8rem 1rem',
    border: '1px solid #e7e5e4', borderRadius: 12,
    background: '#fafaf9', fontSize: '0.9rem', outline: 'none'
  },
  resultsLabel: {
    fontSize: '0.8rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase'
  },
  emptyBox: {
    textAlign: 'center', padding: '4rem 2rem',
    background: '#fafaf9', borderRadius: 16,
    border: '2px dashed #e7e5e4',
  },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1c1917', margin: '0 0 0.5rem' },
  emptySub: { fontSize: '0.9rem', color: '#78716c', margin: 0 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'none', border: 'none', color: '#78716c',
    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
    marginBottom: '1rem'
  }
};

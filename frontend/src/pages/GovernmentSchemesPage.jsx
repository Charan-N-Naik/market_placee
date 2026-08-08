import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/layout/Navbar';
import {
  Landmark, Search, Filter, Bookmark, ExternalLink, FileText, CheckCircle2,
  AlertCircle, ChevronRight, Download, HelpCircle, ShieldCheck, ArrowLeft,
  Sparkles, Calendar, Building2, UserCheck, RefreshCw, X, Layers, Share2, Heart
} from 'lucide-react';

export default function GovernmentSchemesPage() {
  const navigate = useNavigate();

  // State Management
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter States
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'central' | 'state' | 'saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFarmerCat, setSelectedFarmerCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal / Detail View
  const [selectedScheme, setSelectedScheme] = useState(null);

  // Saved / Bookmarked Schemes in LocalStorage
  const [savedSchemeIds, setSavedSchemeIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kisan_saved_schemes') || '[]');
    } catch (_) {
      return [];
    }
  });

  // Fetch schemes from live API backend
  useEffect(() => {
    fetchSchemes();
  }, [selectedState, selectedCategory, selectedFarmerCat, selectedStatus]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (selectedState !== 'all') params.state = selectedState;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedFarmerCat !== 'all') params.farmerCategory = selectedFarmerCat;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const res = await api.get('/schemes', { params });
      if (res.data && res.data.data) {
        setSchemes(res.data.data);
      } else {
        setSchemes([]);
      }
    } catch (err) {
      console.warn('Failed to fetch schemes from backend API, using local verified dataset:', err);
      // Fallback verified real schemes if backend is offline
      setSchemes(fallbackVerifiedSchemes);
    } finally {
      setLoading(false);
    }
  };

  // Toggle bookmark scheme
  const toggleBookmark = (schemeId) => {
    setSavedSchemeIds(prev => {
      let updated;
      if (prev.includes(schemeId)) {
        updated = prev.filter(id => id !== schemeId);
      } else {
        updated = [...prev, schemeId];
      }
      localStorage.setItem('kisan_saved_schemes', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter schemes locally by active tab and search query
  const filteredSchemes = useMemo(() => {
    return schemes.filter(scheme => {
      // Tab filtering
      if (activeTab === 'central' && scheme.governmentType !== 'Central') return false;
      if (activeTab === 'state' && scheme.governmentType !== 'State') return false;
      if (activeTab === 'saved' && !savedSchemeIds.includes(scheme._id || scheme.code)) return false;

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = scheme.schemeName?.toLowerCase().includes(q);
        const descMatch = scheme.shortDescription?.toLowerCase().includes(q);
        const deptMatch = scheme.department?.toLowerCase().includes(q);
        const benefitMatch = scheme.benefits?.toLowerCase().includes(q);
        const kwMatch = scheme.keywords?.some(k => k.toLowerCase().includes(q));
        if (!nameMatch && !descMatch && !deptMatch && !benefitMatch && !kwMatch) {
          return false;
        }
      }

      return true;
    });
  }, [schemes, activeTab, searchQuery, savedSchemeIds]);

  // Real stats counter
  const centralCount = schemes.filter(s => s.governmentType === 'Central').length;
  const stateCount = schemes.filter(s => s.governmentType === 'State').length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] font-sans antialiased pb-28 text-gray-900">
      
      {/* DEDICATED GOVERNMENT PORTAL TOP HEADER WITH DISTINCT BORDER */}
      <header className="bg-white border-b-4 border-[#1F7A4D]/30 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-[#E8F7EE] hover:text-[#1F7A4D] text-gray-700 transition-all cursor-pointer border-2 border-gray-300"
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏛️</span>
              <div>
                <h1 className="text-lg font-black text-gray-900 leading-tight tracking-tight">
                  Kisan<span className="text-[#1F7A4D]">Bazaar</span> • Schemes Portal
                </h1>
                <p className="text-xs font-extrabold text-gray-500">Official Direct Benefit Transfer (DBT) Directives</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#E8F7EE] text-[#1F7A4D] border-2 border-[#1F7A4D]/40 rounded-2xl text-xs font-black shadow-xs">
              <ShieldCheck size={16} /> Official DBT Verified Portal
            </span>
            <button 
              onClick={() => navigate('/buyer/dashboard')}
              className="px-6 py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 border-2 border-[#1F7A4D]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-10 space-y-12">
        
        {/* HERO BANNER SECTION (CRISP BORDERED CONTAINER) */}
        <div className="bg-gradient-to-br from-[#1F7A4D] via-[#165b38] to-[#0f4429] text-white rounded-3xl p-10 md:p-14 shadow-2xl border-4 border-[#1F7A4D]/40 relative overflow-hidden space-y-8">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-amber-300 border-2 border-white/30">
              <Landmark size={16} /> Government Sourcing & Benefit Schemes
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Central & State <span className="text-amber-300">Agricultural Schemes</span>
            </h1>
            <p className="text-base md:text-lg text-emerald-100 font-semibold leading-relaxed">
              Explore authentic government financial support, crop insurance, equipment subsidies, and credit schemes directly sourced from official DBT portals.
            </p>
          </div>

          {/* REAL STATS COUNTER ROW (BORDERED STAT CARDS) */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t-2 border-white/20">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/25 space-y-1 shadow-md">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Total Active Schemes</span>
              <span className="text-3xl md:text-4xl font-black text-white">{schemes.length} Verified</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/25 space-y-1 shadow-md">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Central Schemes (GOI)</span>
              <span className="text-3xl md:text-4xl font-black text-amber-300">{centralCount} Active</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/25 space-y-1 shadow-md">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">State Subsidies</span>
              <span className="text-3xl md:text-4xl font-black text-emerald-300">{stateCount} State Schemes</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/25 space-y-1 shadow-md">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Saved Schemes</span>
              <span className="text-3xl md:text-4xl font-black text-white">{savedSchemeIds.length} Bookmarked</span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR & MULTI-FILTER CONTROL CARD (BORDER-4) */}
        <div className="bg-white/95 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border-4 border-[#E8F7EE] shadow-xl space-y-8">
          
          {/* CATEGORY TAB BUTTONS */}
          <div className="flex flex-wrap items-center gap-4 border-b-2 border-gray-200 pb-6">
            {[
              { id: 'all', label: 'All Schemes', count: schemes.length },
              { id: 'central', label: 'Central Government (GOI)', count: centralCount },
              { id: 'state', label: 'State Subsidies', count: stateCount },
              { id: 'saved', label: 'Saved / Bookmarked', count: savedSchemeIds.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 sm:px-6 py-3 rounded-xl text-xs md:text-sm font-bold flex items-center gap-3 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#1F7A4D] text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-zinc-200 hover:bg-[#E8F7EE] hover:border-[#1F7A4D]/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* TALL SEARCH INPUT (WITH CRISP BORDER) */}
          <div className="relative w-full h-16 md:h-18">
            <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#1F7A4D] pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search scheme name, department, keywords, or benefits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-16 pr-12 py-4 bg-zinc-50 hover:bg-white focus:bg-white text-gray-900 text-sm md:text-base font-semibold rounded-xl border border-zinc-200 hover:border-[#1F7A4D]/40 focus:border-[#1F7A4D] focus:ring-4 focus:ring-[#1F7A4D]/10 outline-none transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* MULTI-FILTER DROPDOWNS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-zinc-100">
            
            {/* State Filter */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">State Scope</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-zinc-200 rounded-xl text-xs md:text-sm font-bold text-gray-800 focus:border-[#1F7A4D] focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All States & Union Territories</option>
                <option value="All India">All India (Central Directives)</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Punjab">Punjab</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Scheme Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-zinc-200 rounded-xl text-xs md:text-sm font-bold text-gray-800 focus:border-[#1F7A4D] focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="credit">Direct Credit & DBT</option>
                <option value="insurance">Crop Insurance</option>
                <option value="irrigation">Micro Irrigation & Water</option>
                <option value="machinery">Farm Machinery & Subsidy</option>
                <option value="solar">Solar Agriculture Pumps</option>
                <option value="subsidy">State Crop Subsidies</option>
              </select>
            </div>

            {/* Farmer Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Farmer Eligibility</label>
              <select
                value={selectedFarmerCat}
                onChange={(e) => setSelectedFarmerCat(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-zinc-200 rounded-xl text-xs md:text-sm font-bold text-gray-800 focus:border-[#1F7A4D] focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All Farmer Categories</option>
                <option value="small">Small & Marginal Farmers</option>
                <option value="tenant">Tenant & Sharecroppers</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Application Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-zinc-200 rounded-xl text-xs md:text-sm font-bold text-gray-800 focus:border-[#1F7A4D] focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active & Open</option>
                <option value="upcoming">Upcoming Batch</option>
                <option value="closed">Closed / Expired</option>
              </select>
            </div>

          </div>
        </div>

        {/* SCHEMES GRID & CARDS (BORDERED BOLD CARDS) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-white rounded-[20px] p-6 border border-zinc-100 shadow-[0_1px_8px_rgba(0,0,0,0.03)] animate-pulse space-y-6">
                <div className="h-6 bg-gray-200 rounded-xl w-1/3" />
                <div className="h-8 bg-gray-200 rounded-xl w-3/4" />
                <div className="h-20 bg-gray-100 rounded-2xl w-full" />
                <div className="h-12 bg-gray-200 rounded-2xl w-full" />
              </div>
            ))}
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-dashed border-zinc-300 p-14 text-center space-y-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
            <div className="w-20 h-20 bg-[#E8F7EE] text-[#1F7A4D] rounded-full flex items-center justify-center mx-auto text-3xl font-bold border border-[#1F7A4D]/25">
              🏛️
            </div>
            <h3 className="text-2xl font-black text-gray-900">No Government Schemes Available</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto font-semibold">
              No government schemes found matching your selected search query and state filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedState('all');
                setSelectedCategory('all');
                setSelectedFarmerCat('all');
                setSelectedStatus('all');
                setActiveTab('all');
              }}
              className="px-8 py-3.5 bg-[#1F7A4D] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#165b38] transition-all cursor-pointer shadow-sm inline-flex items-center gap-2 active:scale-95"
            >
              <RefreshCw size={18} /> Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSchemes.map(scheme => {
              const isSaved = savedSchemeIds.includes(scheme._id || scheme.code);
              const isCentral = scheme.governmentType === 'Central';

              return (
                <div
                  key={scheme._id || scheme.code}
                  className="bg-white rounded-[20px] border border-zinc-100 hover:border-[#1F7A4D]/40 p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5 group relative"
                >
                  
                  {/* CARD TOP BADGES ROW */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                        isCentral 
                          ? 'bg-[#E8F7EE] text-[#1F7A4D] border-[#1F7A4D]/35' 
                          : 'bg-amber-50 text-amber-800 border-amber-400'
                      }`}>
                        {isCentral ? '🏛 CENTRAL SCHEME (GOI)' : `🌾 STATE SCHEME (${scheme.state?.toUpperCase()})`}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          {scheme.status || 'Active'}
                        </span>
                        
                        <button
                          onClick={() => toggleBookmark(scheme._id || scheme.code)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            isSaved 
                              ? 'bg-rose-50 border-rose-200 text-rose-600' 
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:text-rose-500 hover:border-rose-200'
                          }`}
                          title={isSaved ? 'Remove Bookmark' : 'Save Scheme'}
                        >
                          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>

                    {/* SCHEME NAME & DEPARTMENT */}
                    <div className="space-y-1">
                      <h3 className="text-lg md:text-xl font-black text-gray-900 group-hover:text-[#1F7A4D] transition-colors leading-snug">
                        {scheme.schemeName}
                      </h3>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-2 pt-0.5">
                        <Building2 size={14} className="text-[#1F7A4D]" />
                        {scheme.department || 'Ministry of Agriculture'}
                      </span>
                    </div>

                    {/* SHORT DESCRIPTION */}
                    <p className="text-xs md:text-sm text-gray-600 font-medium line-clamp-2 leading-relaxed">
                      {scheme.shortDescription}
                    </p>

                    {/* BENEFIT HIGHLIGHT BOX (BORDER-2) */}
                    <div className="p-4 bg-gradient-to-r from-[#FFFDF6] to-[#E8F7EE]/40 rounded-xl border border-[#1F7A4D]/15 space-y-1.5">
                      <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-widest block">Key Benefit</span>
                      <p className="text-xs md:text-sm font-black text-gray-900 leading-snug">
                        {scheme.benefits}
                      </p>
                    </div>

                    {/* METADATA BADGES */}
                    <div className="space-y-2 pt-2 text-xs font-semibold text-gray-600 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-bold">Eligibility:</span>
                        <span className="font-bold text-gray-800 text-right truncate max-w-[220px]">{scheme.eligibility}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-bold">Deadline:</span>
                        <span className="font-bold text-emerald-700">{scheme.deadline || 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS ROW — BOUNDED TEXT & SPACIOUS */}
                  <div className="pt-4 border-t border-zinc-100 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedScheme(scheme)}
                      className="flex-1 min-h-[44px] py-2.5 px-4 sm:px-5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden"
                    >
                      <span className="truncate">Full Details & FAQs</span>
                      <ChevronRight size={16} className="shrink-0" />
                    </button>

                    <a
                      href={scheme.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] py-2.5 px-4 sm:px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      title="Apply on Official Government Portal"
                    >
                      <span>Apply</span>
                      <ExternalLink size={15} className="shrink-0" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ========================================================== */}
      {/* DETAILED SCHEME DRAWER / MODAL */}
      {/* ========================================================== */}
      {selectedScheme && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-[20px] max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-zinc-100 shadow-xl space-y-6 relative p-6 sm:p-8">
            
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setSelectedScheme(null)}
              className="absolute right-6 top-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            {/* MODAL HEADER */}
            <div className="space-y-3 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-[#E8F7EE] text-[#1F7A4D] rounded-full text-xs font-black uppercase tracking-wider border border-[#1F7A4D]/25">
                  {selectedScheme.governmentType} Government Directive
                </span>
                <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-black border border-amber-300">
                  {selectedScheme.state}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                {selectedScheme.schemeName}
              </h2>
              <p className="text-xs text-gray-500 font-extrabold flex items-center gap-2">
                <Building2 size={14} className="text-[#1F7A4D]" />
                {selectedScheme.department}
              </p>
            </div>

            {/* SECTIONS GRID */}
            <div className="space-y-6 pt-2">
              
              {/* OBJECTIVE & BENEFITS */}
              <div className="bg-gradient-to-r from-[#FFFDF6] to-[#E8F7EE]/30 p-5 rounded-xl border border-[#E8F7EE] space-y-2">
                <h4 className="text-xs font-black text-[#1F7A4D] uppercase tracking-wider">Financial Benefit & Subsidy Impact</h4>
                <p className="text-sm font-extrabold text-gray-900 leading-relaxed">
                  {selectedScheme.benefits}
                </p>
              </div>

              {/* ELIGIBILITY CRITERIA */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <UserCheck size={16} className="text-[#1F7A4D]" /> Eligibility Criteria
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-800 leading-relaxed">
                  {selectedScheme.eligibility}
                </div>
              </div>

              {/* REQUIRED DOCUMENTS CHECKLIST */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={16} className="text-[#1F7A4D]" /> Required Documents Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedScheme.documentsRequired?.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-zinc-100 text-xs font-bold text-gray-800 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* APPLICATION PROCESS */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={16} className="text-[#1F7A4D]" /> How to Apply
                </h4>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-xs font-bold text-gray-800 leading-relaxed">
                  {selectedScheme.applicationProcess}
                </div>
              </div>

              {/* FREQUENTLY ASKED QUESTIONS (FAQS) */}
              {selectedScheme.faqs && selectedScheme.faqs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle size={16} className="text-[#1F7A4D]" /> Frequently Asked Questions
                  </h4>
                  <div className="space-y-2">
                    {selectedScheme.faqs.map((faq, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                        <p className="text-xs font-black text-gray-900">Q: {faq.question}</p>
                        <p className="text-xs font-medium text-gray-600">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION FOOTER WITH OFFICIAL PORTAL & PDF GUIDELINES */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                {selectedScheme.pdfUrl ? (
                  <a
                    href={selectedScheme.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download size={16} /> Download Official PDF Guidelines
                  </a>
                ) : (
                  <div />
                )}

                <a
                  href={selectedScheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#e65c00] to-[#ea580c] hover:from-[#d95300] hover:to-[#c94900] text-white text-xs font-black rounded-2xl shadow-xl shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Apply on Official Portal ({selectedScheme.officialUrl?.replace('https://', '')})</span>
                  <ExternalLink size={16} />
                </a>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Local Verified Scheme Dataset Fallback if backend API is offline
const fallbackVerifiedSchemes = [
  {
    _id: '1',
    schemeName: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    code: 'PM-KISAN',
    governmentType: 'Central',
    state: 'All India',
    category: 'credit',
    cropType: 'All Crops',
    farmerCategory: 'all',
    shortDescription: 'Direct income support of ₹6,000 per year paid in 3 equal installments of ₹2,000 directly to farmer bank accounts via Direct Benefit Transfer (DBT).',
    eligibility: 'All landholding farmer families with cultivable land holdings in their name across all States and Union Territories (subject to exclusion criteria).',
    benefits: 'Direct annual cash support of ₹6,000 per family. Zero intermediary involvement, 100% central government funding.',
    applicationProcess: 'Register online at the official pmkisan.gov.in portal using Aadhaar & mobile OTP, or visit your nearest Common Service Centre (CSC) / Agriculture Office.',
    documentsRequired: ['Aadhaar Card', 'Land Ownership Record (RTC/Pahani/7-12)', 'Active Bank Account Passbook', 'Mobile Number linked with Aadhaar'],
    department: 'Ministry of Agriculture & Farmers Welfare, GOI',
    deadline: 'Ongoing Direct Sourcing Active',
    status: 'active',
    officialUrl: 'https://pmkisan.gov.in',
    pdfUrl: 'https://pmkisan.gov.in/Documents/PMKISAN_Operational_Guidelines.pdf',
    keywords: ['pm kisan', '6000', 'dbt', 'cash support', 'kisan samman', 'income support'],
    faqs: [
      { question: 'Who is eligible for PM-KISAN?', answer: 'All landholding farmer families with cultivable land in their name are eligible. Institutional landholders and high-income earners are excluded.' },
      { question: 'How is the amount transferred?', answer: 'The amount of ₹6,000 per year is paid directly into verified bank accounts in three equal installments of ₹2,000 every 4 months.' }
    ]
  },
  {
    _id: '2',
    schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    code: 'PMFBY',
    governmentType: 'Central',
    state: 'All India',
    category: 'insurance',
    cropType: 'All Crops',
    farmerCategory: 'all',
    shortDescription: 'Comprehensive crop insurance against loss of yield caused by natural risks from pre-sowing to post-harvest stages with minimal premium rates.',
    eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible for coverage.',
    benefits: 'Complete financial compensation for crop damages caused by drought, flood, pests, and localized calamities. Farmer premium capped at 2% for Kharif, 1.5% for Rabi, and 5% for Commercial/Horticultural crops.',
    applicationProcess: 'Apply online through pmfby.gov.in, via Crop Insurance Mobile App, or visit designated bank branches and Common Service Centres (CSCs) before cut-off date.',
    documentsRequired: ['Aadhaar Card', 'Land Record (RTC/Pahani)', 'Sowing Certificate / Declaration', 'Bank Account Passbook'],
    department: 'Ministry of Agriculture & Farmers Welfare, GOI',
    deadline: 'Cutoff: 31st August 2026 for Kharif',
    status: 'active',
    officialUrl: 'https://pmfby.gov.in',
    pdfUrl: 'https://pmfby.gov.in/pdf/PMFBY_Revised_Guidelines.pdf',
    keywords: ['crop insurance', 'fasal bima', 'drought loss', 'flood relief', 'pmfby', 'yield loss'],
    faqs: [
      { question: 'What is the premium rate for food grains?', answer: 'Farmers pay only 2% of the sum insured for Kharif crops and 1.5% for Rabi crops. The balance premium is subsidized by Government.' }
    ]
  },
  {
    _id: '3',
    schemeName: 'Kisan Credit Card (KCC) Scheme',
    code: 'KCC',
    governmentType: 'Central',
    state: 'All India',
    category: 'credit',
    cropType: 'All Crops',
    farmerCategory: 'all',
    shortDescription: 'Subsidized short-term crop loans up to ₹3 Lakh at an effective interest rate of 4% per annum with prompt repayment incentives.',
    eligibility: 'All individual farmers, joint borrowers, tenant farmers, Self Help Groups (SHGs), and Joint Liability Groups (JLGs).',
    benefits: 'Single revolving credit card for crop cultivation expenses, post-harvest costs, and farm maintenance. Interest rate reduced to 4% upon timely repayment.',
    applicationProcess: 'Download single-page KCC application form from myscheme.gov.in or visit any Commercial Bank, RRB, or Cooperative Bank.',
    documentsRequired: ['Duly Filled KCC Application Form', 'Aadhaar / Voter ID Card', 'Land Revenue Records', 'Passport Photo'],
    department: 'Department of Agriculture & Reserve Bank of India (RBI)',
    deadline: 'Ongoing Year-Round Sourcing',
    status: 'active',
    officialUrl: 'https://myscheme.gov.in/schemes/kcc',
    pdfUrl: 'https://www.nabard.org/pdf/KCC_Guidelines.pdf',
    keywords: ['kcc', 'loan', 'credit card', 'interest subsidy', '4 percent', 'crop loan'],
    faqs: [
      { question: 'What is the maximum limit for collateral-free loan?', answer: 'Farmers can get collateral-free KCC crop loans up to ₹1.60 Lakh.' }
    ]
  },
  {
    _id: '4',
    schemeName: 'Karnataka Raitha Siri Scheme (Millet Subsidy)',
    code: 'KA-RAITHASIRI',
    governmentType: 'State',
    state: 'Karnataka',
    category: 'subsidy',
    cropType: 'Millets (Siri Dhanya)',
    farmerCategory: 'all',
    shortDescription: 'Financial assistance of ₹10,000 per hectare directly credited to millet farmers cultivating Siri Dhanya crops in Karnataka.',
    eligibility: 'Farmers cultivating notified millet crops (Foxtail, Little, Kodo, Barnyard, Browntop Millets) in Karnataka.',
    benefits: '₹10,000 per hectare incentive deposited via Direct Benefit Transfer (DBT) into farmer bank account.',
    applicationProcess: 'Register crop sowing details on Fruit Portal (fruits.karnataka.gov.in) and submit application at Raitha Samparka Kendra (RSK).',
    documentsRequired: ['Fruits ID / Aadhaar', 'Land Pahani / RTC showing Millet crop', 'Bank Passbook'],
    department: 'Department of Agriculture, Government of Karnataka',
    deadline: 'Active Kharif & Rabi Season',
    status: 'active',
    officialUrl: 'https://fruits.karnataka.gov.in',
    pdfUrl: 'https://raitamitra.karnataka.gov.in/pdf/RaithaSiri.pdf',
    keywords: ['raitha siri', 'karnataka', 'millet incentive', '10000 per hectare', 'siri dhanya', 'fruits portal'],
    faqs: [
      { question: 'Which crops are covered under Raitha Siri?', answer: 'Covered crops include Ragi, Navane, Same, Haraka, Sajje, and Browntop Millets.' }
    ]
  }
];

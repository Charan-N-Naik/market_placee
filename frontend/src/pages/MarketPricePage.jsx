import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, TrendingUp, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, RefreshCw, MapPin, Info, Store,
  Apple, Wheat, Carrot, Flame, Sprout, Leaf, Citrus
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
  'Tomato': Apple,
  'Ragi': Wheat,
  'Banana': Leaf,
  'Onion': Carrot,
  'Mango': Citrus,
  'Rice': Wheat,
  'Wheat': Wheat,
  'Potato': Carrot,
  'Coconut': Sprout,
  'Chilli': Flame,
  'Sugarcane': Leaf,
  'Groundnut': Sprout,
};

const MarketPricePage = () => {
  const { t } = useTranslation();
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
      setMarketData([]);
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
    <div className="max-w-[1200px] mx-auto px-[5%] pb-32 bg-[#fafaf9] min-h-screen font-sans">
      {/* Header */}
      <div className="flex items-center justify-between py-6 mb-8 border-b-2 border-stone-100">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-transparent border-none text-stone-500 font-black text-xs uppercase tracking-widest hover:text-stone-900 transition-colors cursor-pointer">
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 m-0">
            {t('marketPrice.title')} <span className="text-green-600">{t('marketPrice.titleHighlight')}</span>
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest m-0 mt-1">
            {t('marketPrice.subtitle')}
          </p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-1.5 bg-transparent border-none text-green-600 font-black text-[11px] sm:text-xs cursor-pointer uppercase transition-all hover:text-green-800">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('common.refresh')}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Hero / intro */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <Store size={120} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center bg-green-100 text-green-700 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest mb-4 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              {t('marketPrice.liveFeed')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 m-0 mb-2 tracking-tight">
              {t('marketPrice.heroTitle')} <span className="text-green-600">{t('marketPrice.heroTitleHighlight')}</span>
            </h2>
            <p className="text-sm text-stone-500 m-0 leading-relaxed max-w-2xl">
              {t('marketPrice.heroDesc')}
              {lastUpdated && <span className="text-stone-400 block sm:inline sm:ml-1 mt-1 sm:mt-0 font-bold"> · {t('marketPrice.lastRefreshed')} {lastUpdated}</span>}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('marketPrice.commodities'), value: marketData.length, color: 'text-stone-900', border: 'border-t-stone-700', sub: t('marketPrice.commoditiesSub') },
            { label: t('marketPrice.gainersToday'), value: gainers, color: 'text-green-600', border: 'border-t-green-500', sub: t('marketPrice.gainersSub') },
            { label: t('marketPrice.losersToday'), value: losers, color: 'text-red-600', border: 'border-t-red-500', sub: t('marketPrice.losersSub') },
            { label: t('marketPrice.activeMandis'), value: APMC_MANDIS.length, color: 'text-blue-600', border: 'border-t-blue-500', sub: t('marketPrice.activeMandisSub') },
          ].map(({ label, value, color, border, sub }) => (
            <div key={label} className={`bg-white rounded-2xl border-x border-b border-stone-100 border-t-4 ${border} p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow`}>
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">{label}</p>
                <p className={`text-3xl font-black ${color} m-0 leading-none`}>{value}</p>
              </div>
              <p className="text-xs font-bold text-stone-400 mt-3 m-0">{sub}</p>
            </div>
          ))}
        </div>

        {/* Mandi Filter */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 min-w-max">
            <div className="flex items-center gap-2 pr-4 border-r border-stone-200">
              <Store size={18} className="text-green-600" />
              <span className="text-xs font-black text-stone-900 uppercase">{t('marketPrice.filterByMandi')}</span>
            </div>
            {['All Mandis', ...APMC_MANDIS.map(m => m.name)].map(mandi => {
              const isActive = selectedMandi === mandi;
              return (
                <button
                  key={mandi}
                  onClick={() => setSelectedMandi(mandi)}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer border-none transition-all duration-300 ${isActive ? 'bg-green-600 text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`}
                >
                  {mandi === 'All Mandis' ? t('common.allMandis') : (t(`dynamic.mandis.${mandi}`) || mandi)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Table */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden flex flex-col relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-stone-100 gap-4 bg-white z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center border border-green-100 shrink-0">
                <BarChart3 size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 m-0">{t('marketPrice.consolidatedFeed')}</h3>
                <p className="text-xs text-stone-500 m-0 font-bold mt-1">
                  {filteredData.length} {t('marketPrice.commodities').toLowerCase()} · {selectedMandi === 'All Mandis' ? t('common.allMandis') : (t(`dynamic.mandis.${selectedMandi}`) || selectedMandi)}
                </p>
              </div>
            </div>
            <div className="inline-flex items-center self-start sm:self-auto gap-1.5 text-[10px] font-black text-green-700 bg-green-100 border border-green-200 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <TrendingUp size={14} /> {t('marketPrice.live')}
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-6 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-stone-100 shrink-0"></div>
                  <div className="h-6 bg-stone-100 rounded w-1/4"></div>
                  <div className="hidden sm:block h-6 bg-stone-100 rounded w-1/6"></div>
                  <div className="hidden md:block h-4 bg-stone-100 rounded w-1/3"></div>
                  <div className="hidden lg:block h-6 bg-stone-100 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center p-10 sm:p-16 bg-[#fafaf9] m-6 rounded-2xl border-2 border-dashed border-stone-200">
              <div className="text-5xl mb-4 opacity-50">🛒</div>
              <h3 className="text-xl font-black text-stone-900 m-0 mb-2">{t('marketPrice.marketOffline')}</h3>
              <p className="text-sm text-stone-500 m-0 mb-6">{t('marketPrice.marketOfflineDesc')}</p>
              <button onClick={fetchData} className="inline-flex items-center gap-2 bg-green-600 text-white border-none rounded-xl px-6 py-3 font-black text-sm cursor-pointer hover:bg-green-700 transition-colors shadow-sm">
                {t('marketPrice.retryConnection')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-stone-50 sticky top-0 z-10">
                  <tr className="border-b border-stone-200">
                    {[
                      t('marketPrice.thCommodity'),
                      t('marketPrice.thAvgRate'),
                      t('marketPrice.thChange'),
                      t('marketPrice.thLowHigh'),
                      t('marketPrice.thVolume'),
                      t('marketPrice.thMSP'),
                      t('marketPrice.thMandi')
                    ].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest whitespace-nowrap ${i === 1 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredData.map((item, idx) => {
                    const Icon = COMMODITY_ICONS[item.name] || Sprout;
                    
                    const low = parseFloat(String(item.low).replace(/[^0-9.]/g, '')) || 0;
                    const high = parseFloat(String(item.high).replace(/[^0-9.]/g, '')) || 0;
                    const price = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
                    
                    let rangePercent = 50;
                    if (high > low) {
                       rangePercent = ((price - low) / (high - low)) * 100;
                       rangePercent = Math.max(0, Math.min(100, rangePercent));
                    }

                    return (
                      <tr key={idx} className="hover:bg-stone-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-stone-200 transition-all shrink-0">
                               <Icon size={20} />
                            </div>
                            <span className="font-black text-stone-900 text-sm">{t(`dynamic.crops.${item.name}`) || item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-black text-stone-900 text-lg text-right">{item.price}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1.5 font-black text-xs px-2.5 py-1.5 rounded-lg ${item.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {item.change}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-stone-400 w-10 text-right">{item.low}</span>
                            <div className="flex-1 h-2 bg-stone-100 rounded-full relative overflow-hidden">
                              <div 
                                className={`absolute top-0 bottom-0 left-0 rounded-full ${item.up ? 'bg-gradient-to-r from-[#86efac] to-[#16a34a]' : 'bg-gradient-to-r from-[#fca5a5] to-[#f43f5e]'}`} 
                                style={{ width: `${rangePercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-stone-600 w-10">{item.high}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-stone-500">{item.volume}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-md ${item.msp && item.msp !== '—' && item.msp !== '-' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-400'}`}>
                            {item.msp || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
                            <MapPin size={12} className="text-green-600" />
                            {t(`dynamic.mandis.${item.mandi}`) || item.mandi || '—'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Advisory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 flex flex-col gap-4 border-l-[6px] border-l-amber-500 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Info size={20} />
              </div>
              <h5 className="text-xs font-black text-amber-900 uppercase tracking-widest m-0">{t('marketPrice.expertAdvisory')}</h5>
            </div>
            <p className="text-amber-900 font-bold leading-relaxed text-sm m-0 pl-1">
              {t('marketPrice.expertAdvisoryText')}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-6 flex flex-col gap-4 border-l-[6px] border-l-emerald-500 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <TrendingUp size={20} />
              </div>
              <h5 className="text-xs font-black text-emerald-900 uppercase tracking-widest m-0">{t('marketPrice.marketSentiment')}</h5>
            </div>
            <p className="text-emerald-900 font-bold leading-relaxed text-sm m-0 pl-1">
              {t('marketPrice.marketSentimentText')}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-4 p-5 sm:p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Info size={16} />
          </div>
          <p className="text-xs text-blue-900 font-medium leading-relaxed m-0 pt-1">
            <strong className="font-black text-blue-950 uppercase tracking-wider mr-1">{t('marketPrice.dataSource')}</strong> 
            {t('marketPrice.dataSourceText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketPricePage;

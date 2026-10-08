import { useState } from 'react';
import { 
  Globe, Sparkles, Filter, Layers, ShieldCheck, ChevronRight 
} from 'lucide-react';

const STATE_CROPS = [
  { state: 'Punjab',        crop: 'Wheat',       icon: '🌾', category: 'Cereals',  color: '#b45309', bg: '#fef3c7', fact: 'Produces 19% of India\'s wheat output' },
  { state: 'Haryana',       crop: 'Wheat',       icon: '🌾', category: 'Cereals',  color: '#b45309', bg: '#fef3c7', fact: 'Primary granary belt of Northern India' },
  { state: 'Uttar Pradesh', crop: 'Sugarcane',   icon: '🎋', category: 'Cash Crop',color: '#15803d', bg: '#dcfce7', fact: 'Largest sugarcane production region in Asia' },
  { state: 'West Bengal',   crop: 'Rice',        icon: '🌾', category: 'Cereals',  color: '#4d7c0f', bg: '#ecfccb', fact: 'Contributes 15% to national paddy harvest' },
  { state: 'Andhra Pradesh',crop: 'Rice',        icon: '🌾', category: 'Cereals',  color: '#4d7c0f', bg: '#ecfccb', fact: 'Premier rice bowl of Southern India' },
  { state: 'Tamil Nadu',    crop: 'Banana',      icon: '🍌', category: 'Horticulture',color: '#a16207', bg: '#fef9c3', fact: 'Accounts for 30% of national banana yield' },
  { state: 'Karnataka',     crop: 'Ragi',        icon: '🌱', category: 'Millets',  color: '#16a34a', bg: '#dcfce7', fact: 'India\'s leading finger millet cultivator' },
  { state: 'Maharashtra',   crop: 'Grapes',      icon: '🍇', category: 'Horticulture',color: '#6d28d9', bg: '#f3e8ff', fact: 'Produces 80% of India\'s export grapes' },
  { state: 'Gujarat',       crop: 'Cotton',      icon: '☁️', category: 'Commercial', color: '#0e7490', bg: '#cffafe', fact: 'Leading cotton cultivator and global exporter' },
  { state: 'Rajasthan',     crop: 'Bajra',       icon: '🌾', category: 'Millets',  color: '#b45309', bg: '#fef3c7', fact: 'Largest pearl millet producing state' },
  { state: 'Kerala',        crop: 'Coconut',     icon: '🥥', category: 'Plantation',color: '#15803d', bg: '#dcfce7', fact: 'Harvests 45% of India\'s coconut volume' },
  { state: 'Madhya Pradesh',crop: 'Soybean',     icon: '🫘', category: 'Pulses/Oil',color: '#4d7c0f', bg: '#ecfccb', fact: 'Soybean capital of Central India' },
  { state: 'Odisha',        crop: 'Rice',        icon: '🌾', category: 'Cereals',  color: '#4d7c0f', bg: '#ecfccb', fact: 'Preserves 100+ native heirloom rice species' },
  { state: 'Bihar',         crop: 'Maize',       icon: '🌽', category: 'Cereals',  color: '#c2410c', bg: '#ffedd5', fact: 'High-density corn cultivation corridor' },
  { state: 'Telangana',     crop: 'Cotton',      icon: '☁️', category: 'Commercial', color: '#0e7490', bg: '#cffafe', fact: 'Major long-staple cotton hub' },
  { state: 'Assam',         crop: 'Tea',         icon: '🍵', category: 'Plantation',color: '#047857', bg: '#d1fae5', fact: 'Generates 55% of total Indian tea output' },
  { state: 'Himachal Pradesh', crop: 'Apple',   icon: '🍎', category: 'Horticulture',color: '#b91c1c', bg: '#fee2e2', fact: 'Premier temperate fruit & apple region' },
  { state: 'Uttarakhand',   crop: 'Turmeric',    icon: '🟡', category: 'Spices',   color: '#a16207', bg: '#fef9c3', fact: 'High-curcumin organic turmeric belt' },
  { state: 'Chhattisgarh',  crop: 'Rice',        icon: '🌾', category: 'Cereals',  color: '#4d7c0f', bg: '#ecfccb', fact: 'Central rice basin with rich soil' },
  { state: 'Jharkhand',     crop: 'Maize',       icon: '🌽', category: 'Cereals',  color: '#c2410c', bg: '#ffedd5', fact: 'Sustainable rainfed maize zones' },
  { state: 'Goa',           crop: 'Cashew',      icon: '🥜', category: 'Plantation',color: '#9a3412', bg: '#ffedd5', fact: 'Coastal cashew processing cluster' },
  { state: 'Manipur',       crop: 'Ginger',      icon: '🫚', category: 'Spices',   color: '#854d0e', bg: '#fef9c3', fact: 'Organic GI-tagged ginger origin' },
  { state: 'Nagaland',      crop: 'Potato',      icon: '🥔', category: 'Vegetables',color: '#44403c', bg: '#f5f5f4', fact: 'High-altitude organic potato farming' },
  { state: 'Tripura',       crop: 'Pineapple',   icon: '🍍', category: 'Horticulture',color: '#b45309', bg: '#fef3c7', fact: '2nd largest Queen Pineapple producer' },
];

const CATEGORIES = ['All', 'Cereals', 'Horticulture', 'Commercial', 'Plantation', 'Spices', 'Millets'];

export default function IndiaCropMap({ onStateClick }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const activeItem = selected || hovered;

  const filteredStates = activeCategory === 'All'
    ? STATE_CROPS
    : STATE_CROPS.filter(s => s.category === activeCategory);

  return (
    <div className="bg-[#FFFDF6] rounded-3xl border-2 border-orange-100 p-6 sm:p-8 shadow-sm space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                National Crop Intelligence Map
              </h3>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black uppercase tracking-widest rounded-full shadow-xs">
                APMC 2026 Feed
              </span>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Primary crop classification & yield distribution across 24 Indian agricultural states
            </p>
          </div>
        </div>

        {/* ACTIVE HIGHLIGHT OVERVIEW CARD - Fixed height container to prevent layout reflow / vibration */}
        <div className="min-h-[64px] h-[64px] flex items-center justify-start md:justify-end shrink-0">
          {activeItem ? (
            <div className="bg-white border-2 border-orange-300 rounded-2xl p-2.5 px-3.5 flex items-center gap-3 shadow-md h-full max-w-md">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs shrink-0"
                style={{ backgroundColor: activeItem.bg, color: activeItem.color }}
              >
                {activeItem.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-900 truncate">{activeItem.state}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 shrink-0">
                    {activeItem.category}
                  </span>
                </div>
                <p className="text-xs font-black text-orange-600 mt-0.5 truncate">
                  {activeItem.crop} • <span className="text-[11px] font-semibold text-gray-600">{activeItem.fact}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs h-full">
              <Sparkles size={15} className="text-orange-500 shrink-0" />
              <span className="truncate">Hover or click any state card to inspect yield diagnostics</span>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 shrink-0 mr-1">
          <Filter size={12} /> Filter Belt:
        </span>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20 font-black'
                : 'bg-white hover:bg-orange-50/50 text-gray-700 hover:text-gray-900 border border-gray-200 shadow-xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* STATE CARDS GRID — Stable layout with fixed 125px card height and zero layout shift */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-0.5">
        {filteredStates.map((item) => {
          const isActive = activeItem?.state === item.state;
          return (
            <div
              key={item.state}
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                const isNowSelected = selected?.state !== item.state;
                setSelected(isNowSelected ? item : null);
                if (onStateClick && isNowSelected) onStateClick(item.state);
              }}
              className={`relative h-[125px] p-3.5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between space-y-2 group overflow-hidden transition-colors duration-150 ${
                isActive
                  ? 'bg-white border-orange-500 shadow-md'
                  : 'bg-white border-gray-100 hover:border-orange-300 hover:shadow-xs'
              }`}
            >
              {/* Top Row: Icon + Indicator */}
              <div className="flex items-center justify-between">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs shrink-0"
                  style={{ backgroundColor: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 truncate max-w-[90px]">
                  {item.crop}
                </span>
              </div>

              {/* State & Category Info */}
              <div>
                <h4 className={`text-xs font-black truncate transition-colors ${
                  isActive ? 'text-orange-600' : 'text-gray-900 group-hover:text-orange-600'
                }`}>
                  {item.state}
                </h4>
                <p className="text-[10px] text-gray-500 font-bold truncate mt-0.5">
                  {item.category}
                </p>
              </div>

              {/* Active Glow Accent Line */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-b-2xl" />
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER METRICS BAR */}
      <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs font-extrabold text-gray-500 gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-gray-700">
            <Layers size={14} className="text-orange-600" /> 24 States Mapped
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-gray-700">
            <ShieldCheck size={14} className="text-orange-600" /> ICAR Verified Commodities
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 text-[11px] font-black uppercase tracking-wider cursor-pointer">
          <span>Live APMC Market Integration</span>
          <ChevronRight size={14} />
        </div>
      </div>

    </div>
  );
}

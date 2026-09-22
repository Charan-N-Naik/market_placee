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
    <div className="bg-[#FFFDF6] rounded-3xl border-2 border-[#E8F7EE] p-6 sm:p-8 shadow-lg space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F7EE] text-[#1F7A4D] flex items-center justify-center shadow-xs">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                National Crop Intelligence Map
              </h3>
              <span className="px-3 py-1 bg-[#E8F7EE] text-[#1F7A4D] border border-[#1F7A4D]/30 text-[10px] font-black uppercase tracking-widest rounded-full shadow-xs">
                APMC 2026 Feed
              </span>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Primary crop classification & yield distribution across 24 Indian agricultural states
            </p>
          </div>
        </div>

        {/* ACTIVE HIGHLIGHT OVERVIEW CARD */}
        {activeItem ? (
          <div className="bg-white border-2 border-[#1F7A4D]/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-md animate-in fade-in duration-200">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-xs shrink-0"
              style={{ backgroundColor: activeItem.bg, color: activeItem.color }}
            >
              {activeItem.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">{activeItem.state}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#E8F7EE] text-[#1F7A4D]">
                  {activeItem.category}
                </span>
              </div>
              <p className="text-xs font-black text-[#1F7A4D] mt-0.5">
                {activeItem.crop} • <span className="text-[11px] font-semibold text-gray-600">{activeItem.fact}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs">
            <Sparkles size={15} className="text-[#1F7A4D]" />
            Hover or click any state card to inspect yield diagnostics
          </div>
        )}
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
                ? 'bg-[#1F7A4D] text-white shadow-md shadow-[#1F7A4D]/20 font-black'
                : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 shadow-xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* STATE CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
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
              className={`relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group overflow-hidden ${
                isActive
                  ? 'bg-white border-[#1F7A4D] shadow-md shadow-[#1F7A4D]/15 scale-[1.02]'
                  : 'bg-white border-gray-100 hover:border-[#1F7A4D]/40 hover:shadow-md'
              }`}
            >
              {/* Top Row: Icon + Indicator */}
              <div className="flex items-center justify-between">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1F7A4D] bg-[#E8F7EE] px-2.5 py-0.5 rounded-full border border-[#1F7A4D]/20">
                  {item.crop}
                </span>
              </div>

              {/* State & Category Info */}
              <div>
                <h4 className={`text-xs font-black truncate transition-colors ${
                  isActive ? 'text-[#1F7A4D]' : 'text-gray-900 group-hover:text-[#1F7A4D]'
                }`}>
                  {item.state}
                </h4>
                <p className="text-[10px] text-gray-500 font-bold truncate mt-0.5">
                  {item.category}
                </p>
              </div>

              {/* Active Glow Accent Line */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1F7A4D] rounded-b-2xl" />
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER METRICS BAR */}
      <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs font-extrabold text-gray-500 gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-gray-700">
            <Layers size={14} className="text-[#1F7A4D]" /> 24 States Mapped
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-gray-700">
            <ShieldCheck size={14} className="text-[#1F7A4D]" /> ICAR Verified Commodities
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#1F7A4D] text-[11px] font-black uppercase tracking-wider">
          <span>Live APMC Market Integration</span>
          <ChevronRight size={14} />
        </div>
      </div>

    </div>
  );
}

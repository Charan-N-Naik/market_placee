import { useState } from 'react';

const STATE_CROPS = [
  { state: 'Punjab',        crop: 'Wheat',       emoji: '🌾', color: '#f59e0b', fact: '19% of India\'s wheat' },
  { state: 'Haryana',       crop: 'Wheat',       emoji: '🌾', color: '#f59e0b', fact: 'Granary of India' },
  { state: 'Uttar Pradesh', crop: 'Sugarcane',   emoji: '🎋', color: '#22c55e', fact: 'Largest sugarcane producer' },
  { state: 'West Bengal',   crop: 'Rice',        emoji: '🍚', color: '#84cc16', fact: '15% of India\'s rice' },
  { state: 'Andhra Pradesh',crop: 'Rice',        emoji: '🍚', color: '#84cc16', fact: 'Rice bowl of India' },
  { state: 'Tamil Nadu',    crop: 'Banana',      emoji: '🍌', color: '#eab308', fact: '30% of India\'s banana' },
  { state: 'Karnataka',     crop: 'Ragi',        emoji: '🌱', color: '#16a34a', fact: 'Largest Ragi grower' },
  { state: 'Maharashtra',   crop: 'Grapes',      emoji: '🍇', color: '#7c3aed', fact: '80% of India\'s grapes' },
  { state: 'Gujarat',       crop: 'Cotton',      emoji: '☁️', color: '#06b6d4', fact: 'Top cotton exporter' },
  { state: 'Rajasthan',     crop: 'Bajra',       emoji: '🌾', color: '#d97706', fact: 'Largest bajra producer' },
  { state: 'Kerala',        crop: 'Coconut',     emoji: '🥥', color: '#15803d', fact: '45% of India\'s coconut' },
  { state: 'Madhya Pradesh',crop: 'Soybean',     emoji: '🫘', color: '#65a30d', fact: 'Soybean capital of India' },
  { state: 'Odisha',        crop: 'Rice',        emoji: '🍚', color: '#84cc16', fact: 'Ancient rice varieties' },
  { state: 'Bihar',         crop: 'Maize',       emoji: '🌽', color: '#f97316', fact: 'Fast-growing maize belt' },
  { state: 'Telangana',     crop: 'Cotton',      emoji: '☁️', color: '#06b6d4', fact: 'Major cotton producer' },
  { state: 'Assam',         crop: 'Tea',         emoji: '🍵', color: '#10b981', fact: '55% of India\'s tea' },
  { state: 'Himachal Pradesh', crop: 'Apple',   emoji: '🍎', color: '#ef4444', fact: 'Apple state of India' },
  { state: 'Uttarakhand',   crop: 'Turmeric',    emoji: '🟡', color: '#ca8a04', fact: 'High-quality turmeric' },
  { state: 'Chhattisgarh',  crop: 'Rice',        emoji: '🍚', color: '#84cc16', fact: 'Rice-centric economy' },
  { state: 'Jharkhand',     crop: 'Maize',       emoji: '🌽', color: '#f97316', fact: 'Tribal farming zones' },
  { state: 'Goa',           crop: 'Cashew',      emoji: '🥜', color: '#b45309', fact: 'Cashew capital of India' },
  { state: 'Manipur',       crop: 'Ginger',      emoji: '🫚', color: '#a16207', fact: 'Organic ginger belt' },
  { state: 'Nagaland',      crop: 'Potato',      emoji: '🥔', color: '#78716c', fact: 'Hill potato varieties' },
  { state: 'Tripura',       crop: 'Pineapple',   emoji: '🍍', color: '#f59e0b', fact: '2nd largest pineapple' },
];

const CROP_COLORS = {
  Wheat: '#f59e0b', Rice: '#84cc16', Sugarcane: '#22c55e', Banana: '#eab308',
  Ragi: '#16a34a', Grapes: '#7c3aed', Cotton: '#06b6d4', Bajra: '#d97706',
  Coconut: '#15803d', Soybean: '#65a30d', Maize: '#f97316', Tea: '#10b981',
  Apple: '#ef4444', Turmeric: '#ca8a04', Cashew: '#b45309', Ginger: '#a16207',
  Potato: '#78716c', Pineapple: '#f59e0b',
};

export default function IndiaCropMap({ onStateClick }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const uniqueCrops = [...new Set(STATE_CROPS.map(s => s.crop))];
  const active = selected || hovered;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.mapPin}>🗺️</span>
          <div>
            <h3 style={styles.title}>India Crop Intelligence Map</h3>
            <p style={styles.subtitle}>Most grown crop from each state · Click a state to explore</p>
          </div>
        </div>
        {active && (
          <div style={{ ...styles.tooltip, borderLeftColor: active.color }}>
            <span style={styles.tooltipEmoji}>{active.emoji}</span>
            <div>
              <p style={styles.tooltipState}>{active.state}</p>
              <p style={styles.tooltipCrop}>{active.crop}</p>
              <p style={styles.tooltipFact}>{active.fact}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {uniqueCrops.map(crop => {
          const item = STATE_CROPS.find(s => s.crop === crop);
          return (
            <span key={crop} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: CROP_COLORS[crop] || '#888' }} />
              {item?.emoji} {crop}
            </span>
          );
        })}
      </div>

      {/* Grid of state cards */}
      <div style={styles.grid}>
        {STATE_CROPS.map((item) => {
          const isActive = active?.state === item.state;
          return (
            <div
              key={item.state}
              style={{
                ...styles.stateCard,
                background: isActive
                  ? `linear-gradient(135deg, ${item.color}25, ${item.color}12)`
                  : '#fff',
                borderColor: isActive ? item.color : '#e5e7eb',
                transform: isActive ? 'translateY(-3px) scale(1.03)' : 'none',
                boxShadow: isActive
                  ? `0 8px 24px ${item.color}40`
                  : '0 1px 4px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                const isNowSelected = selected?.state !== item.state;
                setSelected(isNowSelected ? item : null);
                if (onStateClick && isNowSelected) onStateClick(item.state);
              }}
            >
              <span style={styles.cardEmoji}>{item.emoji}</span>
              <div style={styles.cardBody}>
                <p style={{ ...styles.cardState, color: isActive ? item.color : '#1c1917' }}>
                  {item.state}
                </p>
                <p style={styles.cardCrop}>{item.crop}</p>
              </div>
              {isActive && (
                <span style={{ ...styles.activeDot, background: item.color }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Info bar */}
      <div style={styles.infoBar}>
        <span>🌾 {STATE_CROPS.length} States Mapped</span>
        <span>·</span>
        <span>🏆 {uniqueCrops.length} Unique Crops</span>
        <span>·</span>
        <span>📊 Based on 2024 APMC Data</span>
      </div>
    </div>
  );
}

const styles = {
  root: {
    background: 'linear-gradient(135deg, #f0fdf4, #fefce8)',
    borderRadius: 28,
    padding: '2rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  mapPin: { fontSize: '2rem' },
  title: { fontSize: '1.1rem', fontWeight: 800, color: '#1c1917', margin: 0 },
  subtitle: { fontSize: '0.75rem', color: '#78716c', margin: '2px 0 0', fontWeight: 500 },
  tooltip: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    background: '#fff', borderLeft: '4px solid', borderRadius: 12,
    padding: '0.6rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    animation: 'fadeIn 0.2s ease',
  },
  tooltipEmoji: { fontSize: '1.8rem' },
  tooltipState: { fontWeight: 800, fontSize: '0.85rem', color: '#1c1917', margin: 0 },
  tooltipCrop: { fontWeight: 600, fontSize: '0.78rem', color: '#57534e', margin: 0 },
  tooltipFact: { fontSize: '0.7rem', color: '#a8a29e', margin: 0, fontStyle: 'italic' },
  legend: {
    display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem',
    marginBottom: '1.5rem', padding: '0.75rem 1rem',
    background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    fontSize: '0.72rem', fontWeight: 600, color: '#44403c',
  },
  legendDot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  stateCard: {
    border: '1.5px solid', borderRadius: 16,
    padding: '0.8rem 0.7rem',
    cursor: 'pointer',
    transition: 'all 0.22s ease',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    position: 'relative', overflow: 'hidden',
    userSelect: 'none',
  },
  cardEmoji: { fontSize: '1.4rem', flexShrink: 0 },
  cardBody: { minWidth: 0 },
  cardState: { fontSize: '0.75rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardCrop: { fontSize: '0.65rem', color: '#78716c', margin: 0, fontWeight: 500 },
  activeDot: { width: 7, height: 7, borderRadius: '50%', position: 'absolute', top: 8, right: 8 },
  infoBar: {
    display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center',
    marginTop: '1.5rem', padding: '0.6rem',
    fontSize: '0.72rem', fontWeight: 600, color: '#78716c',
    borderTop: '1px solid #e5e7eb',
  },
};

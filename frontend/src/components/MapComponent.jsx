import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { findNearestDistrict } from '../data/karnatakaCropData';

// Fix for default marker icon in leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crop emoji map (fallback if no photo)
const CROP_EMOJIS = {
  'Tomato': '🍅', 'Banana': '🍌', 'Onion': '🧅', 'Mango': '🥭',
  'Potato': '🥔', 'Coconut': '🥥', 'Chilli': '🌶️', 'Sugarcane': '🎋',
  'Groundnut': '🥜', 'Grapes': '🍇', 'Pomegranate': '🍎', 'Watermelon': '🍉',
  'Rice': '🌾', 'Paddy': '🌾', 'Ragi': '🌾', 'Wheat': '🌾',
  'Maize': '🌽', 'Cotton': '☁️', 'Sunflower': '🌻',
  'Turmeric': '🟡', 'Jowar': '🌾', 'Arecanut': '🌴', 'Coffee': '☕',
  'Cashew': '🥜', 'Pepper': '🫑', 'Cardamom': '🌿', 'Mulberry': '🍃',
  'Tobacco': '🍂', 'Soybean': '🫘',
};

// Create a realistic region marker icon
const createRegionIcon = (emoji, topCrop, photoUrl, count) => {
  const content = photoUrl 
    ? `<div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; position: relative; background: #fff;">
         <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
       </div>`
    : `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 26px; background: #fff; border-radius: 50%;">${emoji}</div>`;

  const badge = count > 1 
    ? `<div style="position: absolute; top: -6px; right: -6px; background: #ea580c; color: white; font-size: 11px; font-weight: 900; border-radius: 12px; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 2px solid white; z-index: 10;">${count}</div>`
    : '';

  return L.divIcon({
    className: 'region-marker',
    html: `
      <div style="
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #059669, #047857);
        border: 3px solid #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        position: relative; cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      " onmouseover="this.style.transform='scale(1.1) translateY(-4px)'" onmouseout="this.style.transform='scale(1) translateY(0)'">
        ${content}
        ${badge}
      </div>
      <div style="
        margin-top: 6px; text-align: center; 
        font-size: 11px; font-weight: 900; color: #064e3b; 
        text-shadow: 0px 0px 4px rgba(255,255,255,0.9), 0px 0px 6px rgba(255,255,255,0.9);
        white-space: nowrap; letter-spacing: 0.5px;
        background: rgba(255,255,255,0.85); border-radius: 6px; padding: 2px 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      ">${topCrop}</div>
    `,
    iconSize: [60, 80],
    iconAnchor: [30, 40],
    popupAnchor: [0, -42],
  });
};

// Create individual marker icon
const createIndividualIcon = (emoji, photoUrl) => {
  const content = photoUrl 
    ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
    : `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 20px;">${emoji}</div>`;

  return L.divIcon({
    className: 'individual-marker',
    html: `
      <div style="
        width: 44px; height: 44px; border-radius: 50%;
        background: #fff;
        border: 3px solid #10b981; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        position: relative; cursor: pointer;
      ">
        ${content}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
};

// Create clicked-district marker icon
const createDistrictClickIcon = (emoji) => {
  return L.divIcon({
    className: 'district-click-marker',
    html: `
      <div style="
        width: 48px; height: 48px; border-radius: 50%;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: 3px solid #fff; box-shadow: 0 0 0 4px rgba(245,158,11,0.3), 0 8px 24px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; cursor: pointer;
        animation: pulseGlow 2s ease-in-out infinite;
      ">
        ${emoji}
      </div>
      <style>
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(245,158,11,0.3), 0 8px 24px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 0 0 10px rgba(245,158,11,0.15), 0 8px 24px rgba(0,0,0,0.25); }
        }
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -28],
  });
};


// Component to dynamically fit bounds to all markers
const FitBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [markers, map]);
  return null;
};

// Component to handle map clicks and show district crop data
const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      const district = findNearestDistrict(lat, lng);
      if (district) {
        onMapClick({ lat: district.lat, lng: district.lng, district });
      }
    },
  });
  return null;
};

// Build the popup HTML for a clicked district
function buildDistrictPopupHTML(district) {
  const topCrop = district.topCrops[0];
  const barColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  const cropsHTML = district.topCrops.map((crop, i) => {
    const barColor = barColors[i % barColors.length];
    return `
      <div style="display: flex; align-items: center; gap: 8px; padding: 7px 0; ${i < district.topCrops.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
        <span style="font-size: 22px; line-height: 1; min-width: 28px; text-align: center; filter: saturate(1.3);">${crop.emoji}</span>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <span style="font-weight: 800; font-size: 12px; color: #1f2937;">${crop.name}</span>
            <span style="font-weight: 900; font-size: 11px; color: ${barColor};">${crop.share}%</span>
          </div>
          <div style="height: 6px; background: #f3f4f6; border-radius: 6px; overflow: hidden;">
            <div style="height: 100%; width: ${crop.share}%; background: ${barColor}; border-radius: 6px; transition: width 0.8s ease;"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div style="min-width: 260px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
      <div style="
        background: linear-gradient(135deg, #f59e0b, #d97706);
        margin: -14px -14px 0 -14px; padding: 18px 16px 14px;
        border-radius: 12px 12px 0 0; position: relative; overflow: hidden;
      ">
        <div style="position: absolute; top: -20px; right: -10px; font-size: 80px; opacity: 0.15; transform: rotate(-15deg);">${topCrop.emoji}</div>
        <div style="position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">📍</span>
            <h4 style="font-weight: 900; font-size: 17px; color: #fff; margin: 0; text-shadow: 0 1px 3px rgba(0,0,0,0.15);">${district.name}</h4>
          </div>
          <p style="font-size: 10px; color: #fef3c7; font-weight: 700; margin: 2px 0 0 0; letter-spacing: 0.5px; text-transform: uppercase;">
            ${district.season} • ${district.rainfall} avg. rainfall
          </p>
        </div>
      </div>

      <div style="padding: 12px 0 2px 0;">
        <div style="
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border-radius: 14px; padding: 12px 14px;
          margin-bottom: 12px; border: 1px solid #fde68a;
        ">
          <p style="font-size: 9px; font-weight: 900; color: #92400e; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 5px 0;">
            🏆 #1 Most Grown Crop
          </p>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 36px; filter: saturate(1.4); line-height: 1;">${topCrop.emoji}</span>
            <div>
              <p style="font-size: 18px; font-weight: 900; color: #92400e; margin: 0; line-height: 1.1;">${topCrop.name}</p>
              <p style="font-size: 11px; font-weight: 700; color: #b45309; margin: 2px 0 0 0;">${topCrop.share}% of farmland</p>
            </div>
          </div>
        </div>

        <p style="font-size: 9px; font-weight: 900; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0;">
          📊 Crop Distribution
        </p>
        <div style="max-height: 180px; overflow-y: auto; padding-right: 2px;">
          ${cropsHTML}
        </div>
      </div>
    </div>`;
}


export default function MapComponent({ listings, aggregated = false }) {
  const navigate = useNavigate();
  const defaultCenter = [14.5, 76.0]; // Center of Karnataka
  const [clickedDistrict, setClickedDistrict] = useState(null);

  const handleMapClick = useCallback((data) => {
    setClickedDistrict(data);
  }, []);

  // Group listings by approximate location (clustering)
  const groupedData = useMemo(() => {
    const validListings = listings.filter(l => l.location?.lat && l.location?.lng);
    
    if (!aggregated) {
      // Return individual valid listings mapped properly
      return validListings.map(l => ({
        ...l,
        lat: l.location.lat,
        lng: l.location.lng,
        isGroup: false
      }));
    }

    // Aggregate by rounding lat/lng to 1 decimal place (approx 11km resolution)
    const groups = {};
    validListings.forEach(l => {
      // To spread them out slightly if exact same, add small random jitter
      const jitterLat = (Math.random() - 0.5) * 0.05;
      const jitterLng = (Math.random() - 0.5) * 0.05;
      
      const latKey = l.location.lat.toFixed(1);
      const lngKey = l.location.lng.toFixed(1);
      const key = `${latKey},${lngKey}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          lat: parseFloat(latKey) + jitterLat,
          lng: parseFloat(lngKey) + jitterLng,
          district: l.location.district || l.location.address || 'Region',
          listings: [],
          cropCounts: {},
          isGroup: true
        };
      }
      
      groups[key].listings.push(l);
      
      const cropName = l.cropName || 'Other';
      if (!groups[key].cropCounts[cropName]) {
        groups[key].cropCounts[cropName] = {
          count: 0,
          photo: l.images?.[0]?.url || l.photo || null
        };
      }
      groups[key].cropCounts[cropName].count += 1;
    });
    
    // Process groups to find dominant crops
    return Object.values(groups).map(g => {
      let dominantCrop = 'Other';
      let maxCount = 0;
      let dominantPhoto = null;
      
      Object.entries(g.cropCounts).forEach(([name, data]) => {
        if (data.count > maxCount) {
          maxCount = data.count;
          dominantCrop = name;
          dominantPhoto = data.photo;
        }
      });
      
      g.dominantCrop = dominantCrop;
      g.dominantPhoto = dominantPhoto;
      
      // Sort crops by count for popup display
      g.sortedCrops = Object.entries(g.cropCounts)
        .map(([name, data]) => ({ name, count: data.count }))
        .sort((a, b) => b.count - a.count);
        
      return g;
    });
  }, [listings, aggregated]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-[24px] overflow-hidden shadow-sm border border-gray-100 z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={aggregated ? 7 : 10} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Click handler for district crop data */}
        <ClickHandler onMapClick={handleMapClick} />

        {/* Clicked district marker */}
        {clickedDistrict && (
          <Marker
            key={`district-${clickedDistrict.district.name}`}
            position={[clickedDistrict.lat, clickedDistrict.lng]}
            icon={createDistrictClickIcon(clickedDistrict.district.topCrops[0].emoji)}
          >
            <Popup className="district-crop-popup" maxWidth={340} autoPan={true}>
              <div dangerouslySetInnerHTML={{ __html: buildDistrictPopupHTML(clickedDistrict.district) }} />
            </Popup>
          </Marker>
        )}

        {/* Render markers (grouped or individual) */}
        {groupedData.map((item) => {
          if (item.isGroup) {
            // Render Aggregated Group Marker
            const emoji = CROP_EMOJIS[item.dominantCrop] || '🌱';
            const icon = createRegionIcon(emoji, item.dominantCrop, item.dominantPhoto, item.listings.length);

            return (
              <Marker key={item.id} position={[item.lat, item.lng]} icon={icon}>
                <Popup className="custom-popup" maxWidth={320}>
                  <div style={{ padding: '0', minWidth: '240px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #059669, #047857)', 
                      margin: '-14px -14px 12px -14px', padding: '16px 16px', 
                      borderRadius: '12px 12px 0 0',
                    }}>
                      <h4 style={{ fontWeight: 900, fontSize: '16px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📍 {item.district}
                      </h4>
                      <p style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600, marginTop: '4px', margin: '4px 0 0 0' }}>
                        {item.listings.length} Available Listings in this region
                      </p>
                    </div>

                    <div style={{ 
                      background: '#ecfdf5', borderRadius: '12px', padding: '12px 14px', 
                      marginBottom: '12px', border: '1px solid #a7f3d0'
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', margin: '0 0 6px 0' }}>
                        🏆 Dominant Crop
                      </p>
                      <p style={{ fontSize: '20px', fontWeight: 900, color: '#047857', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.dominantPhoto ? (
                          <img src={item.dominantPhoto} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : emoji} 
                        {item.dominantCrop}
                      </p>
                    </div>

                    {item.sortedCrops.length > 0 && (
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', margin: '0 0 8px 0' }}>
                          Crop Varieties Found
                        </p>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                          {item.sortedCrops.map((crop) => (
                            <div key={crop.name} style={{ 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #f3f4f6'
                            }}>
                              <span style={{ fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {CROP_EMOJIS[crop.name] || '🌱'} {crop.name}
                              </span>
                              <span style={{ 
                                fontWeight: 800, fontSize: '10px', color: '#059669',
                                background: '#d1fae5', padding: '3px 8px', borderRadius: '12px'
                              }}>
                                {crop.count} {crop.count === 1 ? 'Listing' : 'Listings'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          } else {
            // Render Individual Listing Marker
            const emoji = CROP_EMOJIS[item.cropName] || '🌱';
            const photoUrl = item.images?.[0]?.url || item.photo || null;
            const icon = createIndividualIcon(emoji, photoUrl);

            return (
              <Marker key={item._id || item.id} position={[item.lat, item.lng]} icon={icon}>
                <Popup className="custom-popup">
                  <div style={{ padding: '4px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {photoUrl && (
                      <img src={photoUrl} alt={item.cropName} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                    )}
                    <h4 style={{ fontWeight: 900, color: '#111827', fontSize: '14px', margin: '0 0 4px 0' }}>{item.cropName}</h4>
                    <p style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600, margin: '0 0 6px 0' }}>
                      {item.quantity} {item.unit} • <span style={{ color: '#059669' }}>₹{item.pricePerUnit}/{item.unit}</span>
                    </p>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px 0' }}>📍 {item.location.address || item.location.district}</p>
                    <button 
                      onClick={() => navigate(`/listing/${item._id || item.id}`)}
                      style={{
                        background: '#10b981', color: 'white', border: 'none', padding: '8px', width: '100%',
                        borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.5px', cursor: 'pointer', display: 'flex', justifyContent: 'center'
                      }}
                    >
                      View Full Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          }
        })}

        {groupedData.length > 0 && <FitBounds markers={groupedData} />}
      </MapContainer>
    </div>
  );
}

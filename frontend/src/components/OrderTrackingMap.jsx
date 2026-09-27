import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, MapPin, ShieldCheck, CheckCircle2, Clock, Navigation, 
  Radio, PhoneCall, Check, AlertCircle, X, ChevronRight, User, Package
} from 'lucide-react';
import { getSocket } from '../utils/socket';

/* ─── Custom Leaflet DivIcons ─── */
const createMarkerIcon = (type, isLive = false) => {
  let bgColor = '#16a34a';
  let iconSvg = '';

  if (type === 'farmer') {
    bgColor = '#ea580c'; // Warm orange for farmer origin plot
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  } else if (type === 'agent') {
    bgColor = '#2563eb'; // Royal Blue for Delivery Agent
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="3" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
  } else {
    bgColor = '#059669'; // Emerald for Buyer delivery point
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  }

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      background: ${bgColor};
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      cursor: pointer;
    ">
      ${iconSvg}
      ${type === 'agent' && isLive ? `
        <div style="
          position: absolute;
          inset: -7px;
          border-radius: 50%;
          border: 2.5px solid #2563eb;
          opacity: 0.75;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-order-leaflet-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

/* Auto-Fit Bounds Component */
function MapBoundsUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (err) {
        // Bounds fit safety fallback
      }
    }
  }, [bounds, map]);
  return null;
}

export default function OrderTrackingMap({ order, onClose }) {
  const orderId = order?._id || order?.id;
  const initialStatus = order?.deliveryRequestStatus || order?.status || 'pending';
  
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [lastUpdated, setLastUpdated] = useState(() => {
    return order?.lastKnownAgentLocation?.updatedAt 
      ? new Date(order.lastKnownAgentLocation.updatedAt) 
      : new Date();
  });

  // Default coordinate constants (Hubli Agri Storage -> Mangaluru Port Corridor)
  const defaultFarmerCoords = [15.3647, 75.1240];
  const defaultBuyerCoords = [12.9141, 74.8560];

  const farmerCoords = (order?.farmer?.location?.lat && order?.farmer?.location?.lng)
    ? [order.farmer.location.lat, order.farmer.location.lng]
    : defaultFarmerCoords;

  const buyerCoords = (order?.buyer?.location?.lat && order?.buyer?.location?.lng)
    ? [order.buyer.location.lat, order.buyer.location.lng]
    : (order?.deliveryAddress?.lat && order?.deliveryAddress?.lng)
      ? [order.deliveryAddress.lat, order.deliveryAddress.lng]
      : defaultBuyerCoords;

  // Agent location initialized from persistent order.lastKnownAgentLocation
  const [agentCoords, setAgentCoords] = useState(() => {
    if (order?.lastKnownAgentLocation?.lat && order?.lastKnownAgentLocation?.lng) {
      return [order.lastKnownAgentLocation.lat, order.lastKnownAgentLocation.lng];
    }
    // Midpoint between farm and buyer as smooth initial position
    return [
      (farmerCoords[0] + buyerCoords[0]) / 2,
      (farmerCoords[1] + buyerCoords[1]) / 2,
    ];
  });

  const [authError, setAuthError] = useState(null);
  const [hasLiveSignal, setHasLiveSignal] = useState(false);
  const isDelivered = ['delivered', 'received'].includes(currentStatus);

  // Socket.IO Room Connection & Event Handling
  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    const roomId = `order:${orderId}`;

    // Join order-scoped room
    socket.emit('join_room', roomId);
    console.log(`[OrderTrackingMap] Emitted join_room for ${roomId}`);

    // Listen for live agent location updates
    const handleLocationUpdate = (data) => {
      if (isDelivered) return; // Stop tracking automatically when delivered
      if (data && data.lat !== undefined && data.lng !== undefined) {
        setAgentCoords([Number(data.lat), Number(data.lng)]);
        setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : new Date());
        setHasLiveSignal(true);
      }
    };

    // Listen for order status updates (e.g. status changes to delivered)
    const handleOrderUpdate = (data) => {
      if (data && (data.orderId === orderId || data.order?._id === orderId)) {
        const newStatus = data.status || data.deliveryRequestStatus || data.order?.status;
        if (newStatus) {
          setCurrentStatus(newStatus);
        }
      }
    };

    // Listen for room authorization or connection errors
    const handleSocketError = (err) => {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('authorized') || msg.toLowerCase().includes('authentication') || err?.roomId === roomId) {
        setAuthError(msg);
      }
    };

    socket.on('agent_location', handleLocationUpdate);
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('agent_location', handleLocationUpdate);
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('error', handleSocketError);
      socket.emit('leave_room', roomId);
      console.log(`[OrderTrackingMap] Left room ${roomId}`);
    };
  }, [orderId, isDelivered]);

  // Derived details
  const farmerName = order?.farmer?.name || order?.farmerDetails?.farmerName || 'Kisan Producer Farm';
  const farmerAddress = order?.farmer?.location?.address || order?.farmerDetails?.pickupAddress || 'Dharwad Agri Plot, Hubli Region';
  
  const buyerName = order?.buyer?.name || order?.buyerDropDetails?.buyerName || 'Valued Buyer';
  const deliveryAddress = order?.deliveryAddress?.fullAddress || 
    (order?.deliveryAddress?.addressLine1 ? `${order.deliveryAddress.addressLine1}, ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''}` : 'Vamanjoor, Mangaluru, Karnataka');

  const agentName = order?.deliveryAgent?.name || order?.driver?.name || 'Verified Delivery Agent';
  const agentPhone = order?.deliveryAgent?.phone || order?.driver?.phone || '';
  const agentVehicle = order?.deliveryAgent?.deliveryAgentProfile?.vehicleType || order?.driver?.vehicleType || 'Express Agri Cargo';
  const agentLicense = order?.deliveryAgent?.deliveryAgentProfile?.vehicleNumber || order?.driver?.vehicleNumber || 'KA-19-EA-4821';

  // Polyline corridor
  const polylineCoords = [farmerCoords, agentCoords, buyerCoords];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
      
      {/* ─── HEADER BAR ─── */}
      <div className="bg-zinc-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/25 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Order Tracking</span>
              {isDelivered ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 size={10} /> DELIVERED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Radio size={10} className="animate-pulse text-blue-400" /> LIVE GPS ACTIVE
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Order #{orderId?.slice(-8)?.toUpperCase()}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700/80 text-right">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-semibold">Status</span>
            <span className="font-bold text-emerald-400 capitalize">
              {currentStatus.replace('_', ' ')}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close Map"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ─── AUTHORIZATION ERROR BANNER ─── */}
      {authError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>Room Access Error: {authError}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-md">
            Unauthorized
          </span>
        </div>
      )}

      {/* ─── STATUS NOTICE BANNER ─── */}
      {isDelivered ? (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Produce delivered successfully. Live tracking completed.</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
            Finished
          </span>
        </div>
      ) : (
        <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Navigation size={13} className="text-blue-600 animate-spin shrink-0" />
            <span>Live location broadcasting to order room. Updates every ~10 seconds.</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-semibold">
            Last ping: {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : 'Just now'}
          </span>
        </div>
      )}

      {/* ─── LEAFLET MAP CONTAINER ─── */}
      <div className="h-[360px] sm:h-[420px] w-full relative z-0">
        <MapContainer
          center={agentCoords}
          zoom={9}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsUpdater bounds={[farmerCoords, agentCoords, buyerCoords]} />

          {/* 1. Farmer Plot Marker */}
          <Marker position={farmerCoords} icon={createMarkerIcon('farmer')}>
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <span className="font-black text-orange-600 block text-[11px] uppercase tracking-wider">🌾 Farmer Plot</span>
                <p className="font-bold text-zinc-900">{farmerName}</p>
                <p className="text-zinc-600 text-[11px]">{farmerAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* 2. Live Agent Marker */}
          <Marker position={agentCoords} icon={createMarkerIcon('agent', !isDelivered)}>
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <span className="font-black text-blue-600 block text-[11px] uppercase tracking-wider">🚚 Delivery Agent</span>
                <p className="font-bold text-zinc-900">{agentName}</p>
                <p className="text-zinc-600 text-[11px]">{agentVehicle} ({agentLicense})</p>
                {agentPhone && (
                  <p className="text-blue-600 font-semibold text-[11px] pt-0.5">📞 {agentPhone}</p>
                )}
                <div className="mt-1 pt-1 border-t border-zinc-100 text-[10px] text-zinc-400">
                  Lat: {agentCoords[0]?.toFixed(4)}, Lng: {agentCoords[1]?.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 3. Buyer Delivery Marker */}
          <Marker position={buyerCoords} icon={createMarkerIcon('buyer')}>
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <span className="font-black text-emerald-600 block text-[11px] uppercase tracking-wider">📍 Delivery Destination</span>
                <p className="font-bold text-zinc-900">{buyerName}</p>
                <p className="text-zinc-600 text-[11px]">{deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Transit Route Polyline */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: isDelivered ? '#059669' : '#2563eb',
              weight: 4,
              opacity: 0.8,
              dashArray: isDelivered ? undefined : '8, 8',
            }}
          />
        </MapContainer>
      </div>

      {/* ─── FOOTER INFO CARDS ─── */}
      <div className="p-4 sm:p-5 bg-zinc-50/80 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        
        {/* Origin */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 space-y-1">
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider block">Pickup Plot</span>
          <p className="font-bold text-zinc-900 truncate">{farmerName}</p>
          <p className="text-zinc-500 text-[11px] truncate">{farmerAddress}</p>
        </div>

        {/* In-Transit Agent */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Assigned Courier</span>
            {agentPhone && (
              <a
                href={`tel:${agentPhone}`}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PhoneCall size={11} /> Call
              </a>
            )}
          </div>
          <p className="font-bold text-zinc-900 truncate">{agentName}</p>
          <p className="text-zinc-500 text-[11px] truncate">{agentVehicle} • {agentLicense}</p>
        </div>

        {/* Drop Destination */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 space-y-1">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Delivery Address</span>
          <p className="font-bold text-zinc-900 truncate">{buyerName}</p>
          <p className="text-zinc-500 text-[11px] truncate">{deliveryAddress}</p>
        </div>

      </div>

    </div>
  );
}

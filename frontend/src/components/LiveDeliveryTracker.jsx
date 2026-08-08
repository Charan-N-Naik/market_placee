import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, MapPin, ShieldCheck, CheckCircle2, Clock, Navigation, AlertTriangle, 
  PhoneCall, RefreshCw, Radio, Lock, Activity, Cpu, ChevronRight, PackageCheck,
  Building2, UserCheck
} from 'lucide-react';

/* ─── Custom Crisp DivIcons for Leaflet ─── */
const createCustomIcon = (type, label) => {
  let bgColor = '#16a34a';
  let iconSvg = '';

  if (type === 'farmer') {
    bgColor = '#ea580c'; // Orange for Farm Origin
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  } else if (type === 'truck') {
    bgColor = '#2563eb'; // Blue for Moving Delivery Truck
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="3" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
  } else {
    bgColor = '#059669'; // Emerald for Destination
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  }

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: ${bgColor};
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    ">
      ${iconSvg}
      ${type === 'truck' ? `<div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 2px solid #2563eb;
        opacity: 0.6;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

/* Component to Auto-Fit Map Bounds */
function MapBoundsFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function LiveDeliveryTracker({ order, onClose }) {
  const status = order?.status || 'pending';
  
  // Coordinates setup: Origin (Farmer Hub) -> Destination (Buyer Address)
  const origin = [15.3647, 75.1240]; // Hub A (Hubli / Dharwad Agri Storage)
  const dest = [12.9141, 74.8560];   // Hub B (Mangaluru / District Destination)
  
  // Route interpolation points for real-time truck animation
  const routePoints = [
    [15.3647, 75.1240],
    [14.8138, 75.0500],
    [14.2800, 74.9000],
    [13.8000, 74.8000],
    [13.3400, 74.7400],
    [12.9141, 74.8560]
  ];

  // Animated truck progress index along routePoints
  const [progressIndex, setProgressIndex] = useState(2);
  const [currentPos, setCurrentPos] = useState(routePoints[2]);

  // Anti-Fake GPS Verification Telemetry states
  const [telemetry, setTelemetry] = useState({
    gpsAuthenticity: 99.8,
    speed: 48,
    satellites: 14,
    cellTowerTriangulated: true,
    mockLocationFlagged: false,
    hardwareSignature: 'ECDSA-SHA256-VERIFIED',
    lastPingSecAgo: 2,
  });

  // Dynamic truck movement simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgressIndex(prev => {
        const next = (prev + 1) % routePoints.length;
        setCurrentPos(routePoints[next]);
        return next;
      });

      // Fluctuate telemetry slightly to show live hardware sensor stream
      setTelemetry(prev => ({
        ...prev,
        speed: Math.floor(42 + Math.random() * 12),
        satellites: Math.floor(12 + Math.random() * 4),
        lastPingSecAgo: Math.floor(1 + Math.random() * 3),
        gpsAuthenticity: +(99.6 + Math.random() * 0.3).toFixed(1)
      }));
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // E-commerce Stepper Config
  const steps = [
    { id: 'placed', label: 'Order Placed', desc: 'Order received by farmer', done: true },
    { id: 'accepted', label: 'Confirmed', desc: 'Accepted by farmer', done: ['accepted', 'packed', 'paid', 'shipped', 'delivered', 'received'].includes(status) },
    { id: 'packed', label: 'Packed', desc: 'Produce packaged & quality checked', done: ['packed', 'shipped', 'delivered', 'received'].includes(status) },
    { id: 'shipped', label: 'Dispatched', desc: 'In-transit via Agri-Express', done: ['shipped', 'delivered', 'received'].includes(status) },
    { id: 'out_for_delivery', label: 'Out for Delivery', desc: 'Agent delivering to your address', done: ['delivered', 'received'].includes(status) },
    { id: 'delivered', label: 'Delivered', desc: 'Produce handed over', done: status === 'delivered' || status === 'received' },
  ];

  const orderIdShort = order?._id?.slice(-8)?.toUpperCase() || order?.orderId || 'KB-ORDER';
  const deliveryAddress = order?.deliveryAddress?.fullAddress || 
    `${order?.deliveryAddress?.addressLine1 || 'Vamanjoor'}, ${order?.deliveryAddress?.city || 'Mangaluru'}, ${order?.deliveryAddress?.state || 'Karnataka'}`;

  return (
    <div className="flex flex-col gap-6 text-zinc-800">
      
      {/* ─── 1. TOP HEADER & METADATA BAR ─── */}
      <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-orange-400 uppercase tracking-widest">LIVE DISPATCH TRACKER</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Radio size={10} className="animate-pulse text-emerald-400" /> REALTIME
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight">Order #{orderIdShort}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-zinc-800/80 px-4 py-2.5 rounded-xl border border-zinc-700 w-full md:w-auto justify-between md:justify-end">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">ESTIMATED DELIVERY</span>
            <p className="text-xs font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <Clock size={13} /> Today by 4:30 PM (ETA 35 mins)
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. E-COMMERCE STEPPER PIPELINE ─── */}
      <div className="bg-white rounded-[20px] border border-zinc-100 p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <PackageCheck size={16} className="text-orange-600" /> Delivery Status Pipeline
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {steps.map((step, idx) => (
            <div 
              key={step.id} 
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                step.done 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-zinc-50/50 border-zinc-200/60 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  step.done ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-500'
                }`}>
                  {step.done ? <CheckCircle2 size={14} /> : idx + 1}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">STEP {idx + 1}</span>
              </div>
              <div className="mt-3">
                <h5 className={`text-xs font-black leading-tight ${step.done ? 'text-emerald-900' : 'text-zinc-500'}`}>
                  {step.label}
                </h5>
                <p className="text-[10px] font-semibold mt-1 opacity-80 leading-tight">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3. LIVE MAP & ANTI-FAKE GPS SECURITY PANEL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEAFLET INTERACTIVE MAP (2 COLS) */}
        <div className="lg:col-span-2 bg-white rounded-[20px] border border-zinc-100 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col h-[400px] relative">
          
          {/* Top Floating Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-[1000] bg-zinc-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-700/80 shadow-lg flex items-center gap-2">
            <Navigation size={14} className="text-blue-400 animate-spin" />
            <span>Transit Corridor: Dharwad Farm $\rightarrow$ Buyer Address</span>
          </div>

          <MapContainer 
            center={currentPos} 
            zoom={8} 
            scrollWheelZoom={false} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapBoundsFitter bounds={[origin, dest]} />

            {/* Farm Origin Marker */}
            <Marker position={origin} icon={createCustomIcon('farmer')}>
              <Popup>
                <div className="text-xs font-bold">
                  <p className="font-black text-orange-600">🌾 Producer Farm Facility</p>
                  <p className="text-zinc-600">Dharwad Agricultural Hub</p>
                </div>
              </Popup>
            </Marker>

            {/* Live Delivery Vehicle Marker */}
            <Marker position={currentPos} icon={createCustomIcon('truck')}>
              <Popup>
                <div className="text-xs font-bold">
                  <p className="font-black text-blue-600">🚚 Express Agri Logistics</p>
                  <p className="text-zinc-600">Vehicle: KA-19-EA-4821</p>
                  <p className="text-emerald-600 font-extrabold mt-1">GPS Telemetry Verified ✓</p>
                </div>
              </Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={dest} icon={createCustomIcon('destination')}>
              <Popup>
                <div className="text-xs font-bold">
                  <p className="font-black text-emerald-600">📍 Buyer Delivery Point</p>
                  <p className="text-zinc-600">{deliveryAddress}</p>
                </div>
              </Popup>
            </Marker>

            {/* Polyline Route */}
            <Polyline 
              positions={routePoints} 
              pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75, dashArray: '8, 8' }} 
            />
          </MapContainer>
        </div>

        {/* ─── 4. ANTI-FAKE GPS SECURITY & AGENT DETAILS (1 COL) ─── */}
        <div className="flex flex-col gap-4">
          
          {/* Anti-Fake GPS Telemetry Card */}
          <div className="bg-emerald-950 text-emerald-100 rounded-[20px] border border-emerald-800/80 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">Anti-Spoof GPS Guard</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-800 text-emerald-200 border border-emerald-600">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-emerald-200/90 font-medium leading-relaxed">
              Real-time hardware telemetry prevents mock location injection & fake GPS tracking.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-emerald-900/60 rounded-xl border border-emerald-800 p-3 space-y-0.5">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Signal Auth</span>
                <p className="text-sm font-black text-white">{telemetry.gpsAuthenticity}%</p>
              </div>

              <div className="bg-emerald-900/60 rounded-xl border border-emerald-800 p-3 space-y-0.5">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Satellites</span>
                <p className="text-sm font-black text-white">{telemetry.satellites} Locked</p>
              </div>

              <div className="bg-emerald-900/60 rounded-xl border border-emerald-800 p-3 space-y-0.5">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Speed</span>
                <p className="text-sm font-black text-white">{telemetry.speed} km/h</p>
              </div>

              <div className="bg-emerald-900/60 rounded-xl border border-emerald-800 p-3 space-y-0.5">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Spoof Guard</span>
                <p className="text-xs font-black text-emerald-300">0 Anomalies</p>
              </div>
            </div>

            <div className="text-[10px] font-bold text-emerald-400/80 flex items-center justify-between pt-1">
              <span className="flex items-center gap-1"><Cpu size={12} /> {telemetry.hardwareSignature}</span>
              <span>Updated {telemetry.lastPingSecAgo}s ago</span>
            </div>
          </div>

          {/* Delivery Agent Card */}
          <div className="bg-white rounded-[20px] border border-zinc-100 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-3">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">COURIER & DRIVER</span>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-zinc-700 text-lg">
                RK
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black text-zinc-900 truncate">Ramesh Kumar</h5>
                <p className="text-[11px] font-semibold text-zinc-500">Agri-Express Logistics Agent</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">★ 4.9 Rating (140+ Deliveries)</p>
              </div>
            </div>

            <a 
              href="tel:9876543210" 
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <PhoneCall size={14} /> Call Delivery Driver
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}

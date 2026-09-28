import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, Star, Search, User, X, CheckCircle2, 
  ShieldCheck, Calendar, Clock, Package, Hash, FileText, Radio, Map
} from 'lucide-react';
import { getAvailableDeliveryAgents, fetchRealDeliveryAgents, calculateDistance, calculateTransportExpenditure, createDeliveryBooking, getAllDeliveryBookings } from '../utils/deliveryService';
import { locations } from '../data/mockData';
import LiveDeliveryTracker from './LiveDeliveryTracker';

export default function DeliveryLogisticsSection({ user, showToast }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeProfileAgent, setActiveProfileAgent] = useState(null);
  const [activeBookingAgent, setActiveBookingAgent] = useState(null);

  // Buyer's transport bookings
  const [myBookings, setMyBookings] = useState([]);
  const [activeTrackingBooking, setActiveTrackingBooking] = useState(null);

  // Comprehensive Farmer Sourcing & Pickup Details state
  const [farmerDetails, setFarmerDetails] = useState({
    farmerName: '',
    farmerPhone: '',
    farmerAltPhone: '',
    cropTypeQuantity: '500 kg Produce',
    pickupDistrict: 'Tumakuru',
    pickupAddress: '',
    pickupPincode: '',
    pickupTimeSlot: 'Morning (8 AM - 11 AM)'
  });

  // Buyer Drop Details state
  const [buyerDropDetails, setBuyerDropDetails] = useState({
    buyerName: user?.name || '',
    buyerPhone: user?.phone || '',
    dropDistrict: user?.location?.district || 'Bengaluru Urban',
    dropAddress: user?.location?.address || 'MG Road, Main Market'
  });

  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    async function loadAgents() {
      setLoading(true);
      const list = await fetchRealDeliveryAgents();
      setAgents(list);
      setLoading(false);
    }
    loadAgents();
  }, []);

  // Poll for transport bookings to detect real-time status updates from delivery agent
  useEffect(() => {
    const refreshBookings = () => {
      const all = getAllDeliveryBookings();
      setMyBookings(all.reverse());
    };
    refreshBookings();
    const interval = setInterval(refreshBookings, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentAgent = activeBookingAgent || agents[0];
  const distanceKm = calculateDistance(farmerDetails.pickupDistrict, buyerDropDetails.dropDistrict);
  const ratePerKm = currentAgent?.ratePerKm || 18;
  const expenditure = calculateTransportExpenditure(distanceKm, ratePerKm);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.vehicleType && agent.vehicleType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (agent.location && agent.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRegion = selectedRegion === 'all' || 
      (agent.location && agent.location.toLowerCase().includes(selectedRegion.toLowerCase())) ||
      (agent.district && agent.district.toLowerCase().includes(selectedRegion.toLowerCase()));
    
    let matchesVehicle = true;
    if (filterType === 'pickup') matchesVehicle = (agent.vehicleType?.toLowerCase().includes('pickup') || agent.vehicleType?.toLowerCase().includes('bolero'));
    if (filterType === 'mini') matchesVehicle = (agent.vehicleType?.toLowerCase().includes('ace') || agent.vehicleType?.toLowerCase().includes('chota'));
    if (filterType === 'truck') matchesVehicle = (agent.vehicleType?.toLowerCase().includes('truck') || agent.vehicleType?.toLowerCase().includes('commercial') || agent.vehicleType?.toLowerCase().includes('eicher'));

    return matchesSearch && matchesRegion && matchesVehicle;
  });

  const handleConfirmBooking = (agent) => {
    const fname = farmerDetails.farmerName || 'Sourcing Farmer';
    const faddr = farmerDetails.pickupAddress || `${farmerDetails.pickupDistrict} Farm Gate`;
    
    const bookingId = `DEL-REQ-${Date.now().toString().slice(-6)}`;
    const booking = createDeliveryBooking(
      bookingId,
      agent,
      expenditure,
      `${fname} (${faddr}, ${farmerDetails.pickupDistrict})`,
      `${buyerDropDetails.buyerName} (${buyerDropDetails.dropAddress}, ${buyerDropDetails.dropDistrict})`,
      { ...farmerDetails, farmerName: fname, pickupAddress: faddr },
      buyerDropDetails
    );

    setBookingSuccess({
      ...booking,
      farmerDetails: { ...farmerDetails, farmerName: fname, pickupAddress: faddr },
      buyerDropDetails,
      agent
    });

    setMyBookings(prev => [booking, ...prev]);
    setActiveBookingAgent(null);
    if (showToast) showToast(`Transport booked successfully with ${agent.name}! Request sent.`, 'success');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Banner & Title Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#1F7A4D] to-teal-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/80 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-200 border border-emerald-700">
            <Truck size={14} className="text-emerald-400" /> Direct Farm Transport Hub
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Verified Agri Delivery Agents</h2>
          <p className="text-xs md:text-sm text-emerald-100 font-semibold leading-relaxed">
            Provide the sourcing farmer details, choose a verified regional delivery driver, calculate per-KM shipping costs, and schedule crop pickups directly from farm locations across Karnataka.
          </p>
        </div>
      </div>

      {/* FARMER PICKUP & BUYER DROP DETAILS INPUT FORM */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F7EE] text-[#1F7A4D] flex items-center justify-center font-black">
            📍
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900 tracking-tight">1. Sourcing Farmer & Pickup Details</h3>
            <p className="text-xs text-stone-500 font-semibold">Enter complete farmer contact and pickup location information for driver assignment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Farmer Pickup Details Card */}
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <User size={15} className="text-amber-700" /> Sourcing Farmer Details
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">Pickup Origin</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Farmer Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Basavaraj Gowda"
                  value={farmerDetails.farmerName}
                  onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Primary Phone *</label>
                  <input
                    type="text"
                    placeholder="98450xxxxx"
                    value={farmerDetails.farmerPhone}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Alt. Contact Phone</label>
                  <input
                    type="text"
                    placeholder="99001xxxxx"
                    value={farmerDetails.farmerAltPhone}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerAltPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Crop & Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 kg Tomatoes"
                    value={farmerDetails.cropTypeQuantity}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, cropTypeQuantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Pickup District *</label>
                  <select
                    value={farmerDetails.pickupDistrict}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupDistrict: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Farm / Warehouse Landmark & Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Near Milk Dairy Gate, Kyatsandra Post, Tumakuru"
                  value={farmerDetails.pickupAddress}
                  onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="572101"
                    value={farmerDetails.pickupPincode}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupPincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">Pickup Slot</label>
                  <select
                    value={farmerDetails.pickupTimeSlot}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupTimeSlot: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Morning (8 AM - 11 AM)">Morning (8 AM - 11 AM)</option>
                    <option value="Noon (12 PM - 3 PM)">Noon (12 PM - 3 PM)</option>
                    <option value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Buyer Destination Card */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={15} className="text-emerald-700" /> Buyer Destination Details
              </span>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">Destination Drop</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1">Buyer Name</label>
                <input
                  type="text"
                  value={buyerDropDetails.buyerName}
                  onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, buyerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1">Buyer Phone</label>
                  <input
                    type="text"
                    value={buyerDropDetails.buyerPhone}
                    onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, buyerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1">Drop District</label>
                  <select
                    value={buyerDropDetails.dropDistrict}
                    onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, dropDistrict: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block mb-1">Delivery Street Address</label>
                <input
                  type="text"
                  value={buyerDropDetails.dropAddress}
                  onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, dropAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* DISTANCE & ESTIMATED EXPENDITURE COST SUMMARY BAR */}
        <div className="bg-[#FFFDF6] rounded-2xl border border-stone-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-widest bg-[#E8F7EE] px-2.5 py-1 rounded-md border border-[#1F7A4D]/20">
              Transport Distance & Cost Calculation
            </span>
            <p className="text-xs font-bold text-stone-800 pt-1">
              {farmerDetails.pickupDistrict || 'Farmer Origin'} → {buyerDropDetails.dropDistrict || 'Buyer Destination'} ({distanceKm} km)
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs w-full md:w-auto justify-between md:justify-end">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Base + Distance Rate</span>
              <span className="text-xs font-black text-stone-800">₹100 Base + ₹{ratePerKm}/km</span>
            </div>
            <div className="h-8 w-px bg-stone-200" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Est. Expenditure</span>
              <span className="text-xl font-black text-[#1F7A4D]">₹{expenditure.totalExpenditure}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOOKING SUCCESS NOTIFICATION */}
      {bookingSuccess && (
        <div className="bg-emerald-950 text-emerald-100 p-6 rounded-3xl border border-emerald-800 shadow-xl space-y-4 animate-scaleUp">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center text-white text-2xl">
                🎉
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">TRANSPORT BOOKING CONFIRMED</span>
                <h3 className="text-lg font-black text-white">Driver Assigned: {bookingSuccess.agent?.name}</h3>
              </div>
            </div>
            <button
              onClick={() => setBookingSuccess(null)}
              className="text-xs font-bold text-emerald-300 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-800/80 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-emerald-300">Booking ID:</span>
              <span className="font-mono font-bold text-white">{bookingSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-300">Farmer Contact:</span>
              <span className="font-bold text-white">{bookingSuccess.farmerDetails?.farmerName} ({bookingSuccess.farmerDetails?.farmerPhone || 'N/A'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-300">Farmer Pickup Origin:</span>
              <span className="font-bold text-white">{bookingSuccess.farmerDetails?.pickupAddress}, {bookingSuccess.farmerDetails?.pickupDistrict}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-300">Buyer Destination Drop:</span>
              <span className="font-bold text-white">{bookingSuccess.buyerDropDetails?.buyerName} ({bookingSuccess.buyerDropDetails?.dropDistrict})</span>
            </div>
            <div className="flex justify-between border-t border-emerald-800 pt-2 font-black text-emerald-400 text-sm">
              <span>Total Transport Fee:</span>
              <span>₹{bookingSuccess.expenditureDetails?.totalExpenditure}</span>
            </div>
          </div>
        </div>
      )}

      {/* MY ACTIVE TRANSPORT BOOKINGS & REAL-TIME MAP TRACKING SECTION */}
      {myBookings.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                🚛
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 tracking-tight">My Transport Bookings & Tracking ({myBookings.length})</h3>
                <p className="text-xs text-stone-500 font-semibold">Real-time GPS map tracking unlocks once the delivery agent collects the crops from the farmer</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {myBookings.map((b) => {
              const isCollected = b.status === 'collected' || b.deliveryRequestStatus === 'collected' || b.status === 'shipped';
              const isAccepted = b.status === 'driver_accepted' || b.deliveryRequestStatus === 'driver_accepted';
              const isDelivered = b.status === 'delivered' || b.deliveryRequestStatus === 'delivered';
              const isPending = b.status === 'pending_driver_approval' || b.deliveryRequestStatus === 'pending_driver_approval';
              const isRejected = b.status === 'driver_rejected' || b.deliveryRequestStatus === 'driver_rejected';

              return (
                <div key={b.id || b._id} className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-stone-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500">#{b.id || b._id}</span>
                        <span className="text-xs font-black text-stone-900">• Driver: {b.driverName || b.driver?.name} ({b.driver?.vehicleType || 'Vehicle Assigned'})</span>
                      </div>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        Origin: <span className="font-bold text-stone-700">{b.farmerDetails?.farmerName || 'Farmer'} ({b.farmerDetails?.pickupDistrict})</span> → Drop: <span className="font-bold text-stone-700">{b.buyerDropDetails?.buyerName || 'Buyer'} ({b.buyerDropDetails?.dropDistrict})</span>
                      </p>
                    </div>

                    <div>
                      {isPending && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Clock size={12} className="animate-spin text-amber-600" /> Awaiting Driver Acceptance
                        </span>
                      )}
                      {isAccepted && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-blue-600" /> Driver Accepted — Heading to Farm
                        </span>
                      )}
                      {isCollected && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                          <Radio size={12} className="text-emerald-600 animate-ping" /> Crops Collected — Live GPS Active
                        </span>
                      )}
                      {isDelivered && (
                        <span className="bg-green-100 text-green-800 border border-green-300 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-green-600" /> Delivered to Buyer ✓
                        </span>
                      )}
                      {isRejected && (
                        <span className="bg-red-100 text-red-800 border border-red-300 text-[11px] font-black px-3 py-1 rounded-full">
                          Driver Declined Request
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONDITIONAL MAP TRACKING */}
                  {isCollected ? (
                    <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Map size={16} className="text-emerald-600 animate-bounce" />
                          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Real-Time Crop Transit GPS Tracking</h4>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">LIVE TELEMETRY</span>
                      </div>

                      <LiveDeliveryTracker order={b} onClose={() => {}} />
                    </div>
                  ) : (
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                        🔒
                      </div>
                      <div>
                        <p className="font-bold">Real-time Map Track Locked</p>
                        <p className="text-[11px] text-amber-800/80 font-medium">
                          The live GPS map will be displayed here automatically as soon as the delivery agent arrives at the farm and marks the crops as <span className="font-bold underline">Collected</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REGISTERED DELIVERY AGENTS CARDS GRID */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-stone-900 tracking-tight">Available Delivery Agents & Fleets</h3>
            <p className="text-xs text-stone-500 font-semibold">Click driver photo to view full profile details or click Book Driver to request transport</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search agent, vehicle, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
              />
            </div>

            {/* All Districts Filter Dropdown */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none cursor-pointer focus:border-[#1F7A4D]"
            >
              <option value="all">📍 All Regions / Districts</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>📍 {loc}</option>
              ))}
            </select>

            {/* Vehicle Type Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 outline-none cursor-pointer focus:border-[#1F7A4D]"
            >
              <option value="all">🚚 All Vehicles</option>
              <option value="pickup">Bolero Pickup</option>
              <option value="mini">Tata Ace Mini</option>
              <option value="truck">Commercial Truck</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => {
            return (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                {/* Agent Header - Click avatar/name to open full profile */}
                <div 
                  onClick={() => setActiveProfileAgent(agent)}
                  className="flex items-start gap-4 cursor-pointer group"
                >
                  <div className="relative shrink-0">
                    <img
                      src={agent.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                      alt={agent.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-sm group-hover:scale-105 transition-transform"
                    />
                    {agent.isAvailable && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Online & Available" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black text-stone-900 truncate group-hover:text-[#1F7A4D] transition-colors">{agent.name}</h4>
                      
                      {/* Real Rating Badge */}
                      {agent.rating ? (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-amber-800 text-[11px] font-black">
                          <Star size={12} className="fill-amber-500 text-amber-500" />
                          <span>{agent.rating} ({agent.totalReviews})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md border border-stone-200">
                          No ratings yet
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-[#1F7A4D] mt-0.5">{agent.vehicleType}</p>
                    <p className="text-[10px] font-semibold text-stone-400 mt-0.5">
                      Plate: <span className="font-mono text-stone-700 font-bold">{agent.vehicleNumber}</span> • {agent.tripsCompleted > 0 ? `${agent.tripsCompleted} Trips` : 'Active Driver'}
                    </p>
                  </div>
                </div>

                {/* Vehicle Image Preview (if provided) */}
                {agent.vehiclePhoto && (
                  <div 
                    onClick={() => setActiveProfileAgent(agent)}
                    className="h-32 rounded-2xl overflow-hidden border border-stone-100 bg-stone-50 cursor-pointer"
                  >
                    <img src={agent.vehiclePhoto} alt={agent.vehicleType} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                )}

                {/* Specs & Pricing Grid */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-stone-600 font-semibold">
                    <span>Capacity:</span>
                    <span className="font-bold text-stone-900">{agent.capacity || '1.5 Tons'}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 font-semibold">
                    <span>Operating Region:</span>
                    <span className="font-bold text-stone-900">{agent.location || agent.district || 'Karnataka Wide'}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 font-semibold border-t border-stone-200 pt-1.5">
                    <span>Per-KM Tariff:</span>
                    <span className="font-black text-[#1F7A4D] text-sm">₹{agent.ratePerKm || 18}/km</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${agent.phone || '9845012345'}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone size={14} /> Call
                  </a>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBookingAgent(agent);
                    }}
                    className="flex-1 py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Truck size={14} /> Book Driver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL DRIVER PROFILE MODAL */}
      {activeProfileAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative space-y-6 animate-scaleUp">
            
            <button
              onClick={() => setActiveProfileAgent(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 font-bold"
            >
              ✕
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-stone-100 pb-5">
              <img
                src={activeProfileAgent.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={activeProfileAgent.name}
                className="w-20 h-20 rounded-2xl object-cover border border-stone-200 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-stone-900">{activeProfileAgent.name}</h3>
                  <span className="bg-emerald-100 text-[#1F7A4D] p-1 rounded-full text-xs" title="Verified Carrier">
                    <ShieldCheck size={16} />
                  </span>
                </div>
                <p className="text-xs font-bold text-[#1F7A4D]">{activeProfileAgent.vehicleType}</p>
                <p className="text-xs text-stone-500 font-semibold mt-1">
                  📞 {activeProfileAgent.phone} • {activeProfileAgent.location}
                </p>
              </div>
            </div>

            {/* Full Vehicle Photo Preview if available */}
            {activeProfileAgent.vehiclePhoto ? (
              <div className="h-44 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                <img src={activeProfileAgent.vehiclePhoto} alt={activeProfileAgent.vehicleType} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-28 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 text-xs font-bold gap-2">
                <Truck size={24} /> No Vehicle Photo Provided
              </div>
            )}

            {/* Detailed Vehicle Specs */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5 text-xs">
              <div className="flex justify-between font-semibold text-stone-700">
                <span>Vehicle Plate Number:</span>
                <span className="font-mono font-bold text-stone-900">{activeProfileAgent.vehicleNumber || 'KA-06-EA-4821'}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-700">
                <span>Max Payload Capacity:</span>
                <span className="font-bold text-stone-900">{activeProfileAgent.capacity || '1.5 Tons'}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-700">
                <span>Operating Region / District:</span>
                <span className="font-bold text-stone-900">{activeProfileAgent.location || 'Karnataka Wide'}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-700 border-t border-stone-200 pt-2 text-sm">
                <span>Transport Rate / KM:</span>
                <span className="font-black text-[#1F7A4D]">₹{activeProfileAgent.ratePerKm || 18}/km</span>
              </div>
            </div>

            {/* Ratings & Customer Reviews Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Star size={14} className="text-amber-500 fill-amber-500" /> Ratings & Reviews
              </h4>

              {activeProfileAgent.reviews && activeProfileAgent.reviews.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {activeProfileAgent.reviews.map((rev) => (
                    <div key={rev.id} className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-xs space-y-1">
                      <div className="flex justify-between items-center font-bold text-stone-900">
                        <span>{rev.reviewerName}</span>
                        <span className="text-amber-700 font-black">★ {rev.rating}</span>
                      </div>
                      <p className="text-stone-600 text-[11px] font-medium">{rev.reviewText}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center text-xs text-stone-500 font-medium">
                  No reviews submitted yet. Rate this driver after delivery completion!
                </div>
              )}
            </div>

            {/* Action Buttons inside modal */}
            <div className="flex gap-3 pt-2">
              <a
                href={`tel:${activeProfileAgent.phone}`}
                className="flex-1 py-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Phone size={14} /> Call Driver
              </a>
              <button
                type="button"
                onClick={() => {
                  setActiveBookingAgent(activeProfileAgent);
                  setActiveProfileAgent(null);
                }}
                className="flex-1 py-3 bg-[#1F7A4D] hover:bg-[#165b38] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Truck size={14} /> Book Transport
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INTERACTIVE BOOK DRIVER MODAL WITH COMPREHENSIVE FARMER CONTACT DETAILS */}
      {activeBookingAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-stone-200 relative space-y-6 animate-scaleUp">
            
            <button
              onClick={() => setActiveBookingAgent(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F7EE] text-[#1F7A4D] flex items-center justify-center text-xl font-bold">
                🚚
              </div>
              <div>
                <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-wider">Book Transport Driver</span>
                <h3 className="text-xl font-black text-stone-900">{activeBookingAgent.name}</h3>
              </div>
            </div>

            {/* Comprehensive Farmer Contact & Pickup Details Form */}
            <div className="space-y-4 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-amber-700" /> Sourcing Farmer Contact & Pickup Details
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Farmer Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Gowda"
                    value={farmerDetails.farmerName}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">Primary Phone Number *</label>
                    <input
                      type="text"
                      placeholder="98450xxxxx"
                      value={farmerDetails.farmerPhone}
                      onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">Alt. Contact Phone</label>
                    <input
                      type="text"
                      placeholder="99001xxxxx"
                      value={farmerDetails.farmerAltPhone}
                      onChange={(e) => setFarmerDetails({ ...farmerDetails, farmerAltPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">Crop Type & Quantity *</label>
                    <input
                      type="text"
                      placeholder="e.g. 500 kg Fresh Tomatoes"
                      value={farmerDetails.cropTypeQuantity}
                      onChange={(e) => setFarmerDetails({ ...farmerDetails, cropTypeQuantity: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">Pickup District *</label>
                    <select
                      value={farmerDetails.pickupDistrict}
                      onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupDistrict: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {locations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Farm / Warehouse Landmark & Address *</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Milk Dairy Gate, Village Road, Tumakuru"
                    value={farmerDetails.pickupAddress}
                    onChange={(e) => setFarmerDetails({ ...farmerDetails, pickupAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Buyer Drop Details */}
            <div className="space-y-4 pt-2 border-t border-stone-100">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">2. Buyer Drop Destination</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={buyerDropDetails.buyerName}
                    onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, buyerName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Drop District</label>
                  <select
                    value={buyerDropDetails.dropDistrict}
                    onChange={(e) => setBuyerDropDetails({ ...buyerDropDetails, dropDistrict: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Distance & Expenditure Summary */}
            <div className="bg-[#FFFDF6] p-4 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Calculated Distance</span>
                <span className="font-bold text-stone-900">{farmerDetails.pickupDistrict} → {buyerDropDetails.dropDistrict} ({distanceKm} km)</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Total Transport Cost</span>
                <span className="text-lg font-black text-[#1F7A4D]">₹{expenditure.totalExpenditure}</span>
              </div>
            </div>

            {/* Confirm Booking Button */}
            <button
              type="button"
              onClick={() => handleConfirmBooking(activeBookingAgent)}
              className="w-full py-4 bg-[#1F7A4D] hover:bg-[#165b38] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Truck size={16} /> Confirm & Assign Transport Driver
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

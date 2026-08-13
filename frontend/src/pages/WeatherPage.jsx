import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CloudRain, Wind, Droplets, Thermometer,
  Sun, CloudSun, Cloud, Umbrella, MapPin, Loader2,
  Sprout, AlertTriangle, CheckCircle, Eye, BarChart2, List, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
  ReferenceLine
} from 'recharts';

const WEATHER_CODES = {
  0:  { desc: 'Clear Sky',          icon: Sun,       color: 'text-amber-500',  bg: 'bg-amber-50',   dot: '#f59e0b' },
  1:  { desc: 'Mainly Clear',       icon: Sun,       color: 'text-amber-500',  bg: 'bg-amber-50',   dot: '#f59e0b' },
  2:  { desc: 'Partly Cloudy',      icon: CloudSun,  color: 'text-sky-500',    bg: 'bg-sky-50',     dot: '#0ea5e9' },
  3:  { desc: 'Overcast',           icon: Cloud,     color: 'text-slate-500',  bg: 'bg-slate-50',   dot: '#94a3b8' },
  45: { desc: 'Foggy',              icon: Cloud,     color: 'text-slate-400',  bg: 'bg-slate-50',   dot: '#94a3b8' },
  48: { desc: 'Rime Fog',           icon: Cloud,     color: 'text-slate-400',  bg: 'bg-slate-50',   dot: '#94a3b8' },
  51: { desc: 'Light Drizzle',      icon: CloudRain, color: 'text-blue-400',   bg: 'bg-blue-50',    dot: '#60a5fa' },
  53: { desc: 'Moderate Drizzle',   icon: CloudRain, color: 'text-blue-500',   bg: 'bg-blue-50',    dot: '#3b82f6' },
  55: { desc: 'Dense Drizzle',      icon: CloudRain, color: 'text-blue-600',   bg: 'bg-blue-50',    dot: '#2563eb' },
  61: { desc: 'Slight Rain',        icon: CloudRain, color: 'text-blue-500',   bg: 'bg-blue-50',    dot: '#3b82f6' },
  63: { desc: 'Moderate Rain',      icon: Umbrella,  color: 'text-indigo-500', bg: 'bg-indigo-50',  dot: '#6366f1' },
  65: { desc: 'Heavy Rain',         icon: Umbrella,  color: 'text-indigo-600', bg: 'bg-indigo-50',  dot: '#4f46e5' },
  80: { desc: 'Rain Showers',       icon: CloudRain, color: 'text-blue-500',   bg: 'bg-blue-50',    dot: '#3b82f6' },
  81: { desc: 'Moderate Showers',   icon: Umbrella,  color: 'text-indigo-500', bg: 'bg-indigo-50',  dot: '#6366f1' },
  82: { desc: 'Violent Showers',    icon: Umbrella,  color: 'text-indigo-700', bg: 'bg-indigo-50',  dot: '#4338ca' },
  95: { desc: 'Thunderstorm',       icon: Zap,       color: 'text-purple-600', bg: 'bg-purple-50',  dot: '#9333ea' },
  96: { desc: 'Storm & Hail',       icon: Zap,       color: 'text-purple-700', bg: 'bg-purple-50',  dot: '#7e22ce' },
  99: { desc: 'Severe Thunderstorm',icon: Zap,       color: 'text-purple-800', bg: 'bg-purple-50',  dot: '#581c87' },
};

const KARNATAKA_COORDS = {
  'Bengaluru':  { lat: 12.9716, lon: 77.5946 },
  'Mysuru':     { lat: 12.2958, lon: 76.6394 },
  'Tumkur':     { lat: 13.3389, lon: 77.1011 },
  'Hassan':     { lat: 13.0072, lon: 76.1029 },
  'Mandya':     { lat: 12.5218, lon: 76.8951 },
  'Shivamogga': { lat: 13.9299, lon: 75.5681 },
  'Ramanagara': { lat: 12.7233, lon: 77.2759 },
  'Kolar':      { lat: 13.1366, lon: 78.1304 },
};

function getFarmingAdvice(weatherCode, rainProb, temp) {
  const isRainy = weatherCode >= 51 || rainProb > 60;
  const isHot   = temp > 34;
  const isMild  = temp >= 20 && temp <= 30 && !isRainy;
  if (isRainy) return { icon: AlertTriangle, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   borderColor: '#2563eb', title: 'Rain Alert – Pause Field Operations',       advice: 'High precipitation expected. Avoid pesticide spraying and fertilizer application. Clear drainage channels to prevent waterlogging. Good time to transplant paddy seedlings if fields are prepared.' };
  if (isHot)   return { icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200',borderColor: '#f97316', title: 'Heat Advisory – Protect Crops',             advice: 'Temperatures exceeding 34°C. Irrigate crops in early morning or evening to reduce water stress. Mulch vegetable beds. Avoid daytime outdoor labor and protect livestock.' };
  if (isMild)  return { icon: CheckCircle,   color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  borderColor: '#16a34a', title: 'Ideal Conditions – Optimal Farming Window', advice: 'Perfect weather for fertilizer application, pesticide spraying, and mechanical harvesting. Good visibility for drone surveys and soil sampling. Excellent market transport conditions.' };
  return               { icon: Eye,           color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200',  borderColor: '#94a3b8', title: 'Monitor Conditions',                       advice: 'Moderate conditions. Monitor crop moisture levels and check weather updates before field operations. Standard irrigation schedules apply.' };
}

function getAdvisoryConfig(label, humidity, windSpeed, rainProb) {
  if (label === 'Soil Sowing Index') {
    if (humidity > 70) return { value: 'Excellent',    accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', badge: 'bg-green-100 text-green-800' };
    if (humidity > 50) return { value: 'Good',         accent: '#65a30d', bg: '#f7fee7', border: '#d9f99d', badge: 'bg-lime-100 text-lime-800'   };
    return                    { value: 'Moderate',     accent: '#d97706', bg: '#fffbeb', border: '#fde68a', badge: 'bg-amber-100 text-amber-800' };
  }
  if (label === 'Pesticide Spray') {
    if (windSpeed < 15 && rainProb < 30) return { value: 'Optimal',     accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', badge: 'bg-green-100 text-green-800' };
    return                                       { value: 'Not Advised', accent: '#dc2626', bg: '#fef2f2', border: '#fecaca', badge: 'bg-red-100 text-red-800'     };
  }
  if (label === 'Harvest Transport') {
    if (rainProb < 20) return { value: 'Favorable',   accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', badge: 'bg-blue-100 text-blue-800'   };
    if (rainProb < 50) return { value: 'Marginal',    accent: '#d97706', bg: '#fffbeb', border: '#fde68a', badge: 'bg-amber-100 text-amber-800' };
    return                    { value: 'Unfavorable',  accent: '#dc2626', bg: '#fef2f2', border: '#fecaca', badge: 'bg-red-100 text-red-800'     };
  }
  return { value: '-', accent: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', badge: '' };
}

function RadialGauge({ value, color, label, size = 88 }) {
  const pct  = Math.min(100, value);
  const data = [{ name: label, value: pct, fill: color }];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <RadialBarChart width={size} height={size} cx={size/2} cy={size/2}
          innerRadius={size*0.3} outerRadius={size*0.48}
          startAngle={220} endAngle={-40}
          data={[{ value:100, fill:'#f1f5f9' }, ...data]}
          barSize={size*0.14}>
          <RadialBar dataKey="value" cornerRadius={8} background={false} />
        </RadialBarChart>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:size*0.2, fontWeight:900, color:'#1c1917', lineHeight:1 }}>{value}</span>
          <span style={{ fontSize:size*0.13, color:'#78716c', fontWeight:700 }}>%</span>
        </div>
      </div>
      <span style={{ fontSize:'0.6rem', fontWeight:800, color:'#a8a29e', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</span>
    </div>
  );
}

const TempTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'8px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontSize:'0.78rem' }}>
      <p style={{ fontWeight:900, color:'#1c1917', marginBottom:4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color, fontWeight:700, margin:'2px 0' }}>
          {p.name === 'Max' ? '?? Max' : '? Min'}: {p.value}°C
        </p>
      ))}
    </div>
  );
};

const RainTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'8px 14px', boxShadow:'0 4px 16px rgba(59,130,246,0.1)', fontSize:'0.78rem' }}>
      <p style={{ fontWeight:900, color:'#1c1917', marginBottom:4 }}>{label}</p>
      <p style={{ color:'#2563eb', fontWeight:700 }}>?? Rain: {payload[0]?.value}%</p>
    </div>
  );
};

const WeatherPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weatherData,      setWeatherData]      = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [displayLocation,  setDisplayLocation]  = useState('Bengaluru, Karnataka');
  const [forecastView,     setForecastView]     = useState('chart');

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        let lat = KARNATAKA_COORDS['Bengaluru'].lat;
        let lon = KARNATAKA_COORDS['Bengaluru'].lon;
        let locName = 'Bengaluru, Karnataka';
        if (user?.location) {
          const locObj = typeof user.location === 'string' ? { address: user.location } : user.location;
          const q = [locObj.address, locObj.district, locObj.state].filter(Boolean);
          if (q.length) {
            locName = q.join(', ');
            setDisplayLocation(locName);
            try {
              const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locName)}&format=json&limit=1`);
              const gd  = await geo.json();
              if (gd?.length) { lat = parseFloat(gd[0].lat); lon = parseFloat(gd[0].lon); }
              else if (KARNATAKA_COORDS[q[0]]) { lat = KARNATAKA_COORDS[q[0]].lat; lon = KARNATAKA_COORDS[q[0]].lon; }
            } catch (e) { console.warn('Geocoding failed', e); }
          }
        }
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=auto&forecast_days=7`
        );
        if (!res.ok) throw new Error('API failed');
        setWeatherData(await res.json());
      } catch (err) {
        console.error(err);
        setError('Unable to fetch live weather data. Please check your connection.');
      } finally { setLoading(false); }
    };
    fetchWeather();
  }, [user]);

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#fafaf9]">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-blue-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-stone-900">Fetching Live Weather</h2>
        <p className="text-sm text-stone-400 mt-1">Connecting to Open-Meteo satellite data...</p>
      </div>
    </div>
  );

  if (error || !weatherData?.current) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#fafaf9]">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 shadow-sm flex items-center justify-center">
        <AlertTriangle size={30} className="text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-stone-900">Weather Unavailable</h2>
        <p className="text-sm text-stone-400 mt-1">{error || 'Please try again later.'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold">Go Back</button>
      </div>
    </div>
  );

  const currentInfo = WEATHER_CODES[weatherData.current.weather_code] || { desc:'Unknown', icon:Cloud, color:'text-gray-500', bg:'bg-gray-50', dot:'#94a3b8' };
  const CurrentIcon = currentInfo.icon;
  const temp      = Math.round(weatherData.current.temperature_2m);
  const feelsLike = Math.round(weatherData.current.apparent_temperature);
  const humidity  = weatherData.current.relative_humidity_2m;
  const windSpeed = Math.round(weatherData.current.wind_speed_10m);
  const rainProb  = weatherData.daily.precipitation_probability_max[0];
  const advice    = getFarmingAdvice(weatherData.current.weather_code, rainProb, temp);
  const AdviceIcon = advice.icon;

  const chartData = weatherData.daily.time.map((t, i) => {
    const d = new Date(t);
    return {
      day:  i === 0 ? 'Today' : DAYS[d.getDay()],
      Max:  Math.round(weatherData.daily.temperature_2m_max[i]),
      Min:  Math.round(weatherData.daily.temperature_2m_min[i]),
      Rain: weatherData.daily.precipitation_probability_max[i],
    };
  });

  const advisories = [
    { label:'Soil Sowing Index', icon:Sprout,   desc:'Based on humidity & temperature' },
    { label:'Pesticide Spray',   icon:Droplets, desc:'Requires low wind & no rain'      },
    { label:'Harvest Transport', icon:Wind,     desc:'Road condition outlook'            },
  ].map(a => ({ ...a, ...getAdvisoryConfig(a.label, humidity, windSpeed, rainProb) }));

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-20">

      {/* Navbar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-stone-500 font-black text-xs uppercase tracking-widest hover:text-stone-900 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black text-stone-900">Farm <span className="text-blue-600">Weather</span></h1>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Real-time Agri-Meteorology</p>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-7">

        {/* -- Hero Card -- */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8" style={{ borderTop:'4px solid #2563eb' }}>
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sensor Feed
            </div>
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2 flex-wrap">
              <MapPin size={20} className="text-blue-600 flex-shrink-0" />
              {displayLocation}
            </h2>
          </div>

          <div className="flex flex-wrap items-end gap-4 mb-8">
            <div className="flex items-center gap-3">
              <CurrentIcon size={60} className={`${currentInfo.color} flex-shrink-0`} />
              <span className="text-8xl font-black text-blue-950 leading-none">{temp}°</span>
            </div>
            <div className="pb-2">
              <p className="text-2xl font-black text-blue-600">{currentInfo.desc}</p>
              <p className="text-sm text-stone-500 font-semibold mt-1">Feels like {feelsLike}°C</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-2">
              <Wind size={20} className="text-slate-500" />
              <p className="text-xl font-black text-stone-900 leading-tight">{windSpeed} <span className="text-sm font-bold text-stone-400">km/h</span></p>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Wind</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-2">
              <Thermometer size={20} className="text-slate-500" />
              <p className="text-xl font-black text-stone-900 leading-tight">{feelsLike}° <span className="text-sm font-bold text-stone-400">C</span></p>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Feels Like</p>
            </div>
            <div className="bg-sky-50 rounded-2xl p-3 border border-sky-100 flex items-center justify-center">
              <RadialGauge value={humidity} color="#0ea5e9" label="Humidity" size={84} />
            </div>
            <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 flex items-center justify-center">
              <RadialGauge value={rainProb} color="#2563eb" label="Rain Chance" size={84} />
            </div>
          </div>
        </div>

        {/* -- Farming Advisory -- */}
        <div className={`rounded-3xl p-6 border-2 ${advice.bg} flex items-start gap-5`} style={{ borderLeftWidth:5, borderLeftColor:advice.borderColor }}>
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border flex-shrink-0">
            <AdviceIcon size={22} className={advice.color} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[10px] font-black uppercase tracking-widest border shadow-sm">
                <Sprout size={10} /> AI Farming Advisory
              </span>
            </div>
            <h4 className={`font-black text-lg ${advice.color} mb-1`}>{advice.title}</h4>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">{advice.advice}</p>
          </div>
        </div>

        {/* -- 7-Day Forecast -- */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <CloudSun size={18} className="text-blue-600" />
              </div>
              <h4 className="text-xl font-black text-stone-900">7-Day Forecast</h4>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setForecastView('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${forecastView==='chart' ? 'bg-white shadow text-blue-700' : 'text-stone-500 hover:text-stone-800'}`}>
                <BarChart2 size={13} /> Chart
              </button>
              <button onClick={() => setForecastView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${forecastView==='list' ? 'bg-white shadow text-blue-700' : 'text-stone-500 hover:text-stone-800'}`}>
                <List size={13} /> List
              </button>
            </div>
          </div>

          {forecastView === 'chart' && (
            <div className="flex flex-col gap-6">
              {/* Temperature Trend */}
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Temperature Trend (°C)</p>
                <div style={{ width:'100%', height:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top:10, right:10, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="wMaxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="wMinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:700, fill:'#78716c' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:'#78716c' }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip content={<TempTooltip />} />
                      <Area type="monotone" dataKey="Max" stroke="#f97316" strokeWidth={2.5} fill="url(#wMaxGrad)" dot={{ r:4, fill:'#f97316', strokeWidth:0 }} activeDot={{ r:6, fill:'#f97316' }} />
                      <Area type="monotone" dataKey="Min" stroke="#3b82f6" strokeWidth={2.5} fill="url(#wMinGrad)" dot={{ r:4, fill:'#3b82f6', strokeWidth:0 }} activeDot={{ r:6, fill:'#3b82f6' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-stone-500"><span className="w-3 h-1.5 rounded bg-orange-400 inline-block" /> Max Temp</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-stone-500"><span className="w-3 h-1.5 rounded bg-blue-500 inline-block" /> Min Temp</span>
                </div>
              </div>

              {/* Rain Probability */}
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Rain Probability (%)</p>
                <div style={{ width:'100%', height:160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top:5, right:20, left:-20, bottom:0 }} barCategoryGap="30%">
                      <defs>
                        <linearGradient id="wRainGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:700, fill:'#78716c' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:'#78716c' }} axisLine={false} tickLine={false} domain={[0,100]} unit="%" />
                      <Tooltip content={<RainTooltip />} />
                      <ReferenceLine y={60} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value:'Alert', position:'right', fontSize:10, fill:'#f97316', fontWeight:700 }} />
                      <Bar dataKey="Rain" fill="url(#wRainGrad)" radius={[6,6,0,0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {forecastView === 'list' && (
            <div className="flex flex-col gap-2">
              {weatherData.daily.time.map((timeStr, i) => {
                const date     = new Date(timeStr);
                const dayName  = i === 0 ? 'Today' : DAYS[date.getDay()];
                const code     = weatherData.daily.weather_code[i];
                const info     = WEATHER_CODES[code] || { desc:'Unknown', icon:Cloud, color:'text-gray-500', dot:'#94a3b8' };
                const DayIcon  = info.icon;
                const rp       = weatherData.daily.precipitation_probability_max[i];
                const minT     = Math.round(weatherData.daily.temperature_2m_min[i]);
                const maxT     = Math.round(weatherData.daily.temperature_2m_max[i]);
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:shadow-sm ${i===0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:bg-white'}`}>
                    <span className={`w-14 text-sm font-black flex-shrink-0 ${i===0?'text-blue-700':'text-stone-800'}`}>{dayName}</span>
                    <DayIcon size={18} style={{ color:info.dot, flexShrink:0 }} />
                    <span className="flex-1 text-sm font-semibold text-stone-500 truncate min-w-0">{info.desc}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Droplets size={11} className="text-blue-400" />
                      <span className="text-xs font-black text-blue-600">{rp}%</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                      <span className="text-sm font-bold text-stone-400">{minT}°</span>
                      <span className="text-base font-black text-stone-900">{maxT}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* -- Advisory Cards -- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {advisories.map(({ label, icon: Icon, value, accent, bg, border, desc, badge }) => (
            <div key={label} className="rounded-3xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md"
              style={{ background:bg, borderColor:border, borderLeftWidth:5, borderLeftColor:accent }}>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border" style={{ borderColor:border }}>
                  <Icon size={18} style={{ color:accent }} />
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${badge}`}>{value}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-0.5">{label}</p>
                <p className="text-xl font-black" style={{ color:accent }}>{value}</p>
                <p className="text-xs text-stone-400 font-medium mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default WeatherPage;

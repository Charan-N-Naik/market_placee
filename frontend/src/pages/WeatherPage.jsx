import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CloudRain, Wind, Droplets, Thermometer,
  Sun, CloudSun, Cloud, Umbrella, MapPin, Loader2,
  Sprout, AlertTriangle, CheckCircle, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WEATHER_CODES = {
  0: { desc: 'Clear Sky', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
  1: { desc: 'Mainly Clear', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
  2: { desc: 'Partly Cloudy', icon: CloudSun, color: 'text-sky-500', bg: 'bg-sky-50' },
  3: { desc: 'Overcast', icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50' },
  45: { desc: 'Foggy', icon: Cloud, color: 'text-slate-400', bg: 'bg-slate-50' },
  48: { desc: 'Rime Fog', icon: Cloud, color: 'text-slate-400', bg: 'bg-slate-50' },
  51: { desc: 'Light Drizzle', icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-50' },
  53: { desc: 'Moderate Drizzle', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50' },
  55: { desc: 'Dense Drizzle', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50' },
  61: { desc: 'Slight Rain', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50' },
  63: { desc: 'Moderate Rain', icon: Umbrella, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  65: { desc: 'Heavy Rain', icon: Umbrella, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  80: { desc: 'Rain Showers', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50' },
  81: { desc: 'Moderate Showers', icon: Umbrella, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  82: { desc: 'Violent Showers', icon: Umbrella, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  95: { desc: 'Thunderstorm', icon: Umbrella, color: 'text-purple-600', bg: 'bg-purple-50' },
  96: { desc: 'Thunderstorm & Hail', icon: Umbrella, color: 'text-purple-700', bg: 'bg-purple-50' },
  99: { desc: 'Severe Thunderstorm', icon: Umbrella, color: 'text-purple-800', bg: 'bg-purple-50' },
};

const KARNATAKA_COORDS = {
  'Bengaluru': { lat: 12.9716, lon: 77.5946 },
  'Mysuru': { lat: 12.2958, lon: 76.6394 },
  'Tumkur': { lat: 13.3389, lon: 77.1011 },
  'Hassan': { lat: 13.0072, lon: 76.1029 },
  'Mandya': { lat: 12.5218, lon: 76.8951 },
  'Shivamogga': { lat: 13.9299, lon: 75.5681 },
  'Ramanagara': { lat: 12.7233, lon: 77.2759 },
  'Kolar': { lat: 13.1366, lon: 78.1304 },
};

function getFarmingAdvice(weatherCode, rainProb, temp) {
  const isRainy = weatherCode >= 51 || rainProb > 60;
  const isHot = temp > 34;
  const isMild = temp >= 20 && temp <= 30 && !isRainy;

  if (isRainy) {
    return {
      icon: AlertTriangle,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      title: 'Rain Alert – Pause Field Operations',
      advice: 'High precipitation expected. Avoid pesticide spraying and fertilizer application. Clear drainage channels to prevent waterlogging. Good time to transplant paddy seedlings if fields are prepared.',
    };
  }
  if (isHot) {
    return {
      icon: AlertTriangle,
      color: 'text-orange-700',
      bg: 'bg-orange-50 border-orange-200',
      title: 'Heat Advisory – Protect Crops',
      advice: 'Temperatures exceeding 34°C. Irrigate crops in early morning or evening to reduce water stress. Mulch vegetable beds. Avoid daytime outdoor labor and protect livestock.',
    };
  }
  if (isMild) {
    return {
      icon: CheckCircle,
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
      title: 'Ideal Conditions – Optimal Farming Window',
      advice: 'Perfect weather for fertilizer application, pesticide spraying, and mechanical harvesting. Good visibility for drone surveys and soil sampling. Excellent market transport conditions.',
    };
  }
  return {
    icon: Eye,
    color: 'text-slate-700',
    bg: 'bg-slate-50 border-slate-200',
    title: 'Monitor Conditions',
    advice: 'Moderate conditions. Monitor crop moisture levels and check weather updates before field operations. Standard irrigation schedules apply.',
  };
}

const WeatherPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayLocation, setDisplayLocation] = useState('Bengaluru, Karnataka');

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        let lat = KARNATAKA_COORDS['Bengaluru'].lat;
        let lon = KARNATAKA_COORDS['Bengaluru'].lon;
        let locName = 'Bengaluru, Karnataka';

        if (user?.location) {
          const locObj = typeof user.location === 'string' 
            ? { address: user.location } 
            : user.location;
            
          const searchQueries = [];
          if (locObj.address) searchQueries.push(locObj.address);
          if (locObj.district) searchQueries.push(locObj.district);
          if (locObj.state) searchQueries.push(locObj.state);
          
          if (searchQueries.length > 0) {
            locName = searchQueries.join(', ');
            setDisplayLocation(locName);
            
            try {
              const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locName)}&format=json&limit=1`);
              const geocodeData = await geocodeRes.json();
              if (geocodeData && geocodeData.length > 0) {
                lat = parseFloat(geocodeData[0].lat);
                lon = parseFloat(geocodeData[0].lon);
              } else if (KARNATAKA_COORDS[searchQueries[0]]) {
                lat = KARNATAKA_COORDS[searchQueries[0]].lat;
                lon = KARNATAKA_COORDS[searchQueries[0]].lon;
              }
            } catch (err) {
              console.warn('Geocoding failed, using fallback', err);
            }
          }
        }
        
        // Fetch Live Satellite Weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=auto&forecast_days=7`
        );
        
        if (!weatherRes.ok) throw new Error('Weather API failed');
        const data = await weatherRes.json();
        setWeatherData(data);
      } catch (err) {
        console.error(err);
        setError('Unable to fetch live satellite weather data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeather();
  }, [user]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: '#fafaf9' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #f3f4f6' }}>
          <Loader2 size={30} className="animate-spin" color="#2563eb" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1c1917' }}>Fetching Live Weather</h2>
          <p style={{ fontSize: '0.85rem', color: '#78716c', marginTop: '0.3rem' }}>Connecting to Open-Meteo satellite data...</p>
        </div>
      </div>
    );
  }

  if (error || !weatherData?.current) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: '#fafaf9' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fef2f2', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fecaca' }}>
          <AlertTriangle size={30} color="#ef4444" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1c1917' }}>Weather Unavailable</h2>
          <p style={{ fontSize: '0.85rem', color: '#78716c', marginTop: '0.3rem' }}>{error || 'Please try again later.'}</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#1c1917', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Go Back</button>
        </div>
      </div>
    );
  }

  const currentInfo = WEATHER_CODES[weatherData.current.weather_code] || { desc: 'Unknown', icon: Cloud, color: 'text-gray-500', bg: 'bg-gray-50' };
  const CurrentIcon = currentInfo.icon;
  const temp = Math.round(weatherData.current.temperature_2m);
  const feelsLike = Math.round(weatherData.current.apparent_temperature);
  const humidity = weatherData.current.relative_humidity_2m;
  const windSpeed = weatherData.current.wind_speed_10m;
  const rainProb = weatherData.daily.precipitation_probability_max[0];
  const advice = getFarmingAdvice(weatherData.current.weather_code, rainProb, temp);
  const AdviceIcon = advice.icon;

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', paddingBottom: '5rem' }}>
      {/* Navbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, margin: '0 auto', padding: '1.5rem 5%', borderBottom: '1.5px solid #f3f4f6', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#78716c', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase' }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>
            Farm <span style={{ color: '#2563eb' }}>Weather</span>
          </h1>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Real-time Agri-Meteorology</p>
        </div>
        <div style={{ width: 100 }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Hero Weather Card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f3f4f6', borderTop: '4px solid #2563eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '2rem' }}>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.8rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
              Live Sensor Feed
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1c1917', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <MapPin size={20} color="#2563eb" />
              {displayLocation}
            </h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '5rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
              {temp}°
            </span>
            <div style={{ paddingBottom: '0.8rem' }}>
              <p style={{ fontWeight: 900, fontSize: '1.5rem', color: '#2563eb', margin: 0 }}>{currentInfo.desc}</p>
              <p style={{ fontSize: '0.9rem', color: '#78716c', margin: '0.3rem 0 0' }}>Feels like {feelsLike}°C</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {[
              { icon: Wind, label: 'Wind Speed', value: `${windSpeed} km/h` },
              { icon: Droplets, label: 'Humidity', value: `${humidity}%` },
              { icon: Thermometer, label: 'Feels Like', value: `${feelsLike}°C` },
              { icon: CloudRain, label: 'Rain Chance', value: `${rainProb}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 16, padding: '1rem', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                <Icon size={18} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1c1917', margin: 0 }}>{value}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', margin: '0.3rem 0 0' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Farming Advisory */}
        <div className={`rounded-[32px] p-7 border ${advice.bg} flex items-start gap-5`}>
          <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border flex-shrink-0`}>
            <AdviceIcon size={22} className={advice.color} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[10px] font-black uppercase tracking-widest border shadow-sm">
                <Sprout size={10} /> AI Farming Advisory
              </span>
            </div>
            <h4 className={`font-black text-lg ${advice.color} mb-1`}>{advice.title}</h4>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">{advice.advice}</p>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f3f4f6', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloudSun size={18} color="#2563eb" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1c1917', margin: 0 }}>7-Day Forecast</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weatherData.daily.time.map((timeStr, i) => {
              const date = new Date(timeStr);
              const dayName = i === 0 ? 'Today' : days[date.getDay()];
              const code = weatherData.daily.weather_code[i];
              const info = WEATHER_CODES[code] || { desc: 'Unknown', icon: Cloud, color: 'text-gray-500', bg: 'bg-gray-50' };
              const DayIcon = info.icon;
              const rainProbDay = weatherData.daily.precipitation_probability_max[i];
              const minT = Math.round(weatherData.daily.temperature_2m_min[i]);
              const maxT = Math.round(weatherData.daily.temperature_2m_max[i]);

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.8rem 1rem', borderRadius: 14,
                    background: i === 0 ? '#eff6ff' : '#fafaf9',
                    border: `1px solid ${i === 0 ? '#dbeafe' : '#f3f4f6'}`
                  }}
                >
                  <span style={{ width: 60, fontWeight: 900, fontSize: '0.9rem', color: i === 0 ? '#1d4ed8' : '#1c1917' }}>{dayName}</span>
                  <DayIcon size={18} color={i === 0 ? '#2563eb' : '#64748b'} />
                  <span style={{ flex: 1, padding: '0 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#78716c' }}>{info.desc}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 50 }}>
                    <Droplets size={10} color="#60a5fa" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#3b82f6' }}>{rainProbDay}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#a8a29e', fontSize: '0.85rem' }}>{minT}°</span>
                    <span style={{ fontWeight: 900, color: '#1c1917', fontSize: '0.95rem' }}>{maxT}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Soil Sowing Index', value: humidity > 70 ? 'Excellent' : humidity > 50 ? 'Good' : 'Moderate', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', desc: 'Based on humidity & temperature' },
            { label: 'Pesticide Spray Window', value: windSpeed < 15 && rainProb < 30 ? 'Optimal' : 'Not Advised', color: windSpeed < 15 && rainProb < 30 ? 'text-green-700' : 'text-red-700', bg: windSpeed < 15 && rainProb < 30 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100', desc: 'Requires low wind & no rain' },
            { label: 'Harvest Transport', value: rainProb < 20 ? 'Favorable' : rainProb < 50 ? 'Marginal' : 'Unfavorable', color: rainProb < 20 ? 'text-blue-700' : rainProb < 50 ? 'text-amber-700' : 'text-red-700', bg: rainProb < 20 ? 'bg-blue-50 border-blue-100' : rainProb < 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100', desc: 'Road condition outlook' },
          ].map(({ label, value, color, bg, desc }) => (
            <div key={label} className={`p-6 rounded-[28px] border ${bg}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 font-medium mt-1">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default WeatherPage;

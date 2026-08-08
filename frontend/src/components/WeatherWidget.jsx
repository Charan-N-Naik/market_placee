import React from 'react';
import { CloudRain, Sun, Wind, Thermometer, Droplets } from 'lucide-react';

const WeatherWidget = ({ location, onViewDetails }) => {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
      {/* Decorative Background Circles */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Local Forecast</h3>
            <p className="text-2xl font-black mt-1">{location || 'Tumkur, Karnataka'}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
             <CloudRain size={32} />
          </div>
        </div>

        <div className="flex items-end gap-4 mb-8 flex-1">
          <span className="text-7xl font-black tracking-tighter">28°</span>
          <div className="pb-2">
            <p className="font-bold text-lg leading-none">Scattered Rain</p>
            <p className="text-sm font-medium opacity-70">Ideal for sowing</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-6 border-t border-white/20">
          <div className="flex flex-col items-center gap-1">
            <Wind size={18} className="opacity-60" />
            <span className="text-xs font-black">12 km/h</span>
            <span className="text-[10px] uppercase opacity-50 font-bold">Wind</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Droplets size={18} className="opacity-60" />
            <span className="text-xs font-black">65%</span>
            <span className="text-[10px] uppercase opacity-50 font-bold">Humidity</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Thermometer size={18} className="opacity-60" />
            <span className="text-xs font-black">31° / 22°</span>
            <span className="text-[10px] uppercase opacity-50 font-bold">Range</span>
          </div>
        </div>

        {onViewDetails && (
          <button 
            onClick={onViewDetails}
            className="w-full mt-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/10"
          >
            Detailed Forecast
          </button>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;

import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

const MarketTrends = ({ onViewDetails }) => {
  const trends = [
    { name: 'Tomato', price: '₹22/kg', change: '+12%', up: true },
    { name: 'Ragi', price: '₹34/kg', change: '+5%', up: true },
    { name: 'Banana', price: '₹14/kg', change: '-2%', up: false },
    { name: 'Onion', price: '₹28/kg', change: '+18%', up: true },
    { name: 'Mango', price: '₹140/kg', change: '-8%', up: false },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-8 border border-white shadow-xl shadow-green-900/5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-green-600" />
            Market Price Trends
          </h3>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time APMC Insights</p>
        </div>
        <button className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-green-600 transition-colors">
          <Info size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {trends.map((trend) => (
          <div key={trend.name} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-green-200 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs
                ${trend.up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {trend.name.charAt(0)}
              </div>
              <div>
                <p className="font-black text-gray-800">{trend.name}</p>
                <p className="text-xs font-medium text-gray-400">Current Average</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-gray-900">{trend.price}</p>
              <div className={`flex items-center justify-end gap-1 text-xs font-black
                ${trend.up ? 'text-green-600' : 'text-red-600'}`}>
                {trend.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onViewDetails}
        className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-900/10"
      >
        VIEW FULL REPORT
      </button>
    </div>
  );
};

export default MarketTrends;

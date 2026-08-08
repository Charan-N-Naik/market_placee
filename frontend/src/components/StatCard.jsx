import React from 'react';

export default function StatCard({ icon: Icon, label, value, color, bg, delay }) {
  return (
    <div
      className={`${bg} rounded-2xl p-4 border border-white/50 animate-fade-in glass shadow-sm hover:-translate-y-1 transition-transform duration-300`}
      style={{ animationDelay: `${delay}s`, opacity: 0 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center shadow-inner`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-outfit font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600 mt-1 font-medium">{label}</p>
    </div>
  );
}

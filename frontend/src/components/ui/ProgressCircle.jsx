import React from 'react';

/**
 * ProgressCircle renders a circular SVG progress indicator.
 * @param {number} value - 0 to 100
 * @param {string} label - Text to display below the circle
 * @param {string} color - Tailwind color prefix e.g. 'green', 'orange'
 */
export default function ProgressCircle({ value = 0, label = '', color = 'green' }) {
  const radius = 36;
  const stroke = 8;
  const normalized = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  const strokeColor = `stroke-${color}-600`;
  const textColor = `text-${color}-700`;

  return (
    <div className="flex flex-col items-center">
      <svg width="84" height="84" className="transform -rotate-90">
        <circle
          cx="42"
          cy="42"
          r={radius}
          strokeWidth={stroke}
          className="stroke-gray-200"
          fill="none"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          strokeWidth={stroke}
          className={strokeColor}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className={`mt-2 text-sm font-bold ${textColor}`}>{Math.round(normalized)}%</div>
      {label && <div className="text-xs text-gray-500 mt-1">{label}</div>}
    </div>
  );
}

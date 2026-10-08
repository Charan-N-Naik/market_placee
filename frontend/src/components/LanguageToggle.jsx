import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Role-aware theme configurations matching the platform visual identity:
 * - Farmer: Rich Forest / Emerald Green
 * - Buyer: Warm Harvest Amber / Terracotta Orange
 * - Delivery Agent / Driver: Deep Logistics Teal
 * - Admin: Midnight Indigo
 * - Default / Guest: Classic KisanBazaar Green
 */
export const ROLE_TOGGLE_THEMES = {
  farmer: {
    border: 'border-emerald-200 hover:border-emerald-300',
    hoverBg: 'hover:bg-emerald-50',
    iconColor: 'text-emerald-700',
    textColor: 'text-emerald-800',
    shadow: 'hover:shadow-emerald-600/10',
    activeBg: 'active:bg-emerald-100',
  },
  buyer: {
    border: 'border-orange-200 hover:border-orange-300',
    hoverBg: 'hover:bg-orange-50',
    iconColor: 'text-orange-600',
    textColor: 'text-orange-700',
    shadow: 'hover:shadow-orange-500/10',
    activeBg: 'active:bg-orange-100',
  },
  delivery_agent: {
    border: 'border-teal-200 hover:border-teal-300',
    hoverBg: 'hover:bg-teal-50',
    iconColor: 'text-teal-600',
    textColor: 'text-teal-700',
    shadow: 'hover:shadow-teal-500/10',
    activeBg: 'active:bg-teal-100',
  },
  driver: {
    border: 'border-teal-200 hover:border-teal-300',
    hoverBg: 'hover:bg-teal-50',
    iconColor: 'text-teal-600',
    textColor: 'text-teal-700',
    shadow: 'hover:shadow-teal-500/10',
    activeBg: 'active:bg-teal-100',
  },
  admin: {
    border: 'border-indigo-200 hover:border-indigo-300',
    hoverBg: 'hover:bg-indigo-50',
    iconColor: 'text-indigo-600',
    textColor: 'text-indigo-700',
    shadow: 'hover:shadow-indigo-500/10',
    activeBg: 'active:bg-indigo-100',
  },
  default: {
    border: 'border-green-200 hover:border-green-300',
    hoverBg: 'hover:bg-green-50',
    iconColor: 'text-green-700',
    textColor: 'text-green-800',
    shadow: 'hover:shadow-green-600/10',
    activeBg: 'active:bg-green-100',
  },
};

export default function LanguageToggle({ role: propRole, className = '' }) {
  const { i18n } = useTranslation();
  const auth = useAuth();
  const authUser = auth?.user || null;
  const location = useLocation();

  // Determine effective role:
  // 1. Explicit prop passed in
  // 2. Active logged-in user role
  // 3. Current URL route context
  let resolvedRole = propRole || authUser?.role;

  if (!resolvedRole && location?.pathname) {
    const path = location.pathname.toLowerCase();
    if (path.includes('farmer')) {
      resolvedRole = 'farmer';
    } else if (path.includes('buyer') || path.includes('cart') || path.includes('checkout')) {
      resolvedRole = 'buyer';
    } else if (path.includes('delivery') || path.includes('driver')) {
      resolvedRole = 'delivery_agent';
    } else if (path.includes('admin')) {
      resolvedRole = 'admin';
    }
  }

  const normalized = (resolvedRole || '').toLowerCase();
  const themeKey =
    normalized.includes('farmer') ? 'farmer' :
    normalized.includes('buyer') ? 'buyer' :
    (normalized.includes('delivery') || normalized.includes('driver')) ? 'delivery_agent' :
    normalized.includes('admin') ? 'admin' :
    'default';

  const theme = ROLE_TOGGLE_THEMES[themeKey] || ROLE_TOGGLE_THEMES.default;

  const currentLang = i18n.language || 'en';

  const toggleLanguage = () => {
    const newLang = currentLang.startsWith('en') ? 'kn' : 'en';
    i18n.changeLanguage(newLang);
  };

  const hasCustomTextColor = className.includes('text-white') || className.includes('!text-white');
  const iconColor = hasCustomTextColor ? 'text-white' : theme.iconColor;
  const textColor = hasCustomTextColor ? 'text-white' : theme.textColor;

  return (
    <button
      id="language-toggle"
      onClick={toggleLanguage}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        bg-white/95 border ${theme.border} shadow-xs hover:shadow-md ${theme.shadow}
        ${theme.hoverBg} ${theme.activeBg} active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
      title={currentLang.startsWith('en') ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ (Switch to Kannada)' : 'Switch to English (ಇಂಗ್ಲಿಷ್‌ಗೆ ಬದಲಾಯಿಸಿ)'}
    >
      <Globe size={16} className={`${iconColor} shrink-0 transition-colors duration-200`} />
      <span className={`font-bold ${textColor} transition-colors duration-200`}>
        {currentLang.startsWith('en') ? 'ಕನ್ನಡ' : 'EN'}
      </span>
    </button>
  );
}

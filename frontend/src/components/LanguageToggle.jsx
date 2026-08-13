import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  
  const currentLang = i18n.language || 'en';

  const toggleLanguage = () => {
    const newLang = currentLang.startsWith('en') ? 'kn' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      id="language-toggle"
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        bg-white/90 border border-gray-200 shadow-sm hover:shadow-md
        hover:bg-green-50 transition-all duration-200 cursor-pointer ${className}`}
    >
      <Globe size={16} className={className.includes('text-white') ? "text-white" : "text-green-700"} />
      <span className={`font-semibold ${className.includes('text-white') ? "text-white" : "text-green-800"}`}>
        {currentLang.startsWith('en') ? 'ಕನ್ನಡ' : 'EN'}
      </span>
    </button>
  );
}

import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  const toggleLanguage = useCallback(() => {
    setLang(prev => prev === 'en' ? 'kn' : 'en');
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

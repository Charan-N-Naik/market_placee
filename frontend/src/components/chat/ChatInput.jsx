import { Mic, MicOff, Send, Sparkles, Sprout, TrendingUp, Bug, CloudSun, X, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ChatInput({ 
  input, 
  setInput, 
  isListening, 
  isLoading, 
  onVoiceInput, 
  onSend,
  inputRef 
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';

  const handleQuickTopic = (knText, enText) => {
    const textToSet = lang.startsWith('kn') ? knText : enText;
    setInput(textToSet);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="p-3.5 sm:p-5 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0 space-y-2.5">
      
      {/* Quick Prompt Quick-Tabs */}
      <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pb-1 no-scrollbar px-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 shrink-0 hidden md:inline">
          {t('aiAssistant.quickTopics')}
        </span>
        
        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.tomatoPriceQuery', { lng: 'kn' }), t('aiAssistant.tomatoPriceQuery', { lng: 'en' }))}
          className="text-xs font-bold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/80 shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
        >
          <TrendingUp size={12} className="text-emerald-600" />
          <span>{t('aiAssistant.tomatoPrices')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.ragiQuery', { lng: 'kn' }), t('aiAssistant.ragiQuery', { lng: 'en' }))}
          className="text-xs font-bold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/80 shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
        >
          <Sprout size={12} className="text-emerald-600" />
          <span>{t('aiAssistant.ragiCultivation')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.pestQuery', { lng: 'kn' }), t('aiAssistant.pestQuery', { lng: 'en' }))}
          className="text-xs font-bold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-full border border-amber-200/80 shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
        >
          <Bug size={12} className="text-amber-600" />
          <span>{t('aiAssistant.pestControl')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.weatherQuery', { lng: 'kn' }), t('aiAssistant.weatherQuery', { lng: 'en' }))}
          className="text-xs font-bold px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-full border border-teal-200/80 shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
        >
          <CloudSun size={12} className="text-teal-600" />
          <span>{t('aiAssistant.weather')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.schemesQuery', { lng: 'kn' }), t('aiAssistant.schemesQuery', { lng: 'en' }))}
          className="text-xs font-bold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-full border border-blue-200/80 shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
        >
          <ShieldCheck size={12} className="text-blue-600" />
          <span>{t('aiAssistant.govtSchemes')}</span>
        </button>
      </div>

      {/* Main Input Form */}
      <form onSubmit={onSend} className="relative flex items-center justify-center gap-2.5 max-w-2xl mx-auto">
        {/* Pulsing Mic Orb Button */}
        <button
          type="button"
          onClick={onVoiceInput}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-300 flex-shrink-0 shadow-md flex items-center justify-center cursor-pointer active:scale-90 relative ${
            isListening 
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white animate-pulse ring-4 ring-rose-200 shadow-rose-500/30' 
              : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white hover:from-emerald-500 hover:to-teal-600 shadow-emerald-700/20 hover:scale-105'
          }`}
          title={isListening ? "Listening... Tap to stop" : "Tap to Speak (Kannada / English)"}
        >
          {isListening ? (
            <MicOff size={22} className="animate-bounce" />
          ) : (
            <Mic size={22} className="drop-shadow-sm" />
          )}
        </button>

        {/* Text Input Box */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening 
                ? t('aiAssistant.listeningPlaceholder') 
                : t('aiAssistant.typeMessage')
            }
            disabled={isLoading}
            className={`w-full pl-4 pr-24 py-3 sm:py-3.5 border-2 rounded-2xl outline-none transition-all text-sm sm:text-base
              font-semibold text-gray-900 placeholder:text-gray-400 shadow-inner ${
                isListening 
                  ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-100' 
                  : 'border-emerald-200/80 focus:border-emerald-600 bg-slate-50/80 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
              }`}
          />

          {/* Action Buttons: Clear Text + Send */}
          <div className="absolute right-2 flex items-center gap-1">
            {input.trim() && !isLoading && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md hover:scale-105 active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </form>

      {/* Footer Branding */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 max-w-2xl mx-auto pt-0.5">
        <span className="flex items-center gap-1 text-emerald-700">
          <Sparkles size={11} /> {t('aiAssistant.realtimeVoice')}
        </span>
        <span className="hidden sm:inline">{t('aiAssistant.brandEngine')}</span>
      </div>
    </div>
  );
}

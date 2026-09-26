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
    <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0 space-y-4">
      
      {/* Quick Topic Pills - Cohesive Design System */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 hidden md:inline">
          {t('aiAssistant.quickTopics')}
        </span>
        
        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.tomatoPriceQuery', { lng: 'kn' }), t('aiAssistant.tomatoPriceQuery', { lng: 'en' }))}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200/70 hover:border-emerald-300 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <TrendingUp size={13} className="text-emerald-600" />
          <span>{t('aiAssistant.tomatoPrices')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.ragiQuery', { lng: 'kn' }), t('aiAssistant.ragiQuery', { lng: 'en' }))}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200/70 hover:border-emerald-300 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <Sprout size={13} className="text-emerald-600" />
          <span>{t('aiAssistant.ragiCultivation')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.pestQuery', { lng: 'kn' }), t('aiAssistant.pestQuery', { lng: 'en' }))}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200/70 hover:border-emerald-300 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <Bug size={13} className="text-emerald-600" />
          <span>{t('aiAssistant.pestControl')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.weatherQuery', { lng: 'kn' }), t('aiAssistant.weatherQuery', { lng: 'en' }))}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200/70 hover:border-emerald-300 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <CloudSun size={13} className="text-emerald-600" />
          <span>{t('aiAssistant.weather')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickTopic(t('aiAssistant.schemesQuery', { lng: 'kn' }), t('aiAssistant.schemesQuery', { lng: 'en' }))}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200/70 hover:border-emerald-300 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
        >
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>{t('aiAssistant.govtSchemes')}</span>
        </button>
      </div>

      {/* Main Unified Input Group */}
      <form onSubmit={onSend} className="max-w-2xl mx-auto">
        <div className={`relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 transition-all shadow-xs ${
          isListening 
            ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-200' 
            : 'focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10'
        }`}>
          {/* Mic Button integrated into input group */}
          <button
            type="button"
            onClick={onVoiceInput}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
              isListening 
                ? 'bg-rose-600 text-white animate-pulse' 
                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            title={isListening ? "Listening... Tap to stop" : "Tap to Speak (Kannada / English)"}
          >
            {isListening ? (
              <MicOff size={20} className="animate-bounce" />
            ) : (
              <Mic size={20} />
            )}
          </button>

          {/* Text Input */}
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
            className="w-full px-3 py-2 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
          />

          {/* Clear & Send Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {input.trim() && !isLoading && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                input.trim() && !isLoading
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </form>

      {/* Footer Branding - Single Muted Line */}
      <div className="text-center text-[11px] font-medium text-slate-400 pt-1">
        KisanBazaar Intelligence Engine • Realtime Voice AI
      </div>
    </div>
  );
}

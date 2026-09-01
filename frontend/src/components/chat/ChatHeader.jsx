import { Bot, Sparkles, Volume2, VolumeX, Mic, Activity, Trash2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../LanguageToggle';
import { useEffect, useRef, useState } from 'react';

export default function ChatHeader({ 
  isSpeechEnabled, 
  setIsSpeechEnabled, 
  isListening,
  activeSpeakingId,
  stopSpeaking,
  clearChat,
  messageCount = 0
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const audioContextRef = useRef(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
    } catch (e) {
      console.log('AudioContext initialization note:', e);
    }
  }, []);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }

      if (audioContextRef.current) {
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (error) {
      console.log('Audio feedback fallback:', error);
    }
  };

  const handleToggleSpeech = () => {
    const newState = !isSpeechEnabled;
    setIsSpeechEnabled(newState);

    if (newState === false && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (newState === true) {
      playBeep();
    }
  };

  const handleConfirmClear = () => {
    if (clearChat) clearChat();
    setShowConfirmClear(false);
  };

  return (
    <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-900 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shadow-md shrink-0 border-b border-emerald-800/40">
      {/* Left: Avatar & Title */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="relative">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
            <Bot size={22} className="text-emerald-300" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-emerald-900 flex items-center justify-center">
            <span className="w-full h-full rounded-full bg-emerald-300 animate-ping opacity-75" />
          </span>
        </div>

        <div>
          <h3 className="text-white font-bold text-base sm:text-lg flex items-center gap-1.5 tracking-tight">
            {t('aiAssistant.voiceAiTitle')}
            <Sparkles size={14} className="text-amber-300" />
          </h3>
          <p className="text-emerald-200/80 text-xs font-medium flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isListening 
              ? t('aiAssistant.listening') 
              : activeSpeakingId 
                ? t('aiAssistant.speaking')
                : t('aiAssistant.readyActive')}
          </p>
        </div>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Active Speech Playing Indicator */}
        {activeSpeakingId && (
          <button
            type="button"
            onClick={stopSpeaking}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Stop Speech"
          >
            <Square size={12} className="fill-amber-300" />
            <span className="hidden md:inline">{t('aiAssistant.stopAudio')}</span>
          </button>
        )}

        <LanguageToggle className="!bg-white/10 !border-white/15 !text-white hover:!bg-white/20 text-xs font-semibold" />

        {/* Speech Toggle Button */}
        <button 
          type="button"
          onClick={handleToggleSpeech}
          aria-pressed={isSpeechEnabled}
          className={`p-2 rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5 border text-xs font-semibold ${
            isSpeechEnabled 
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-200 border-rose-400/30 hover:bg-rose-500/30'
          }`}
          title={isSpeechEnabled ? "Disable Voice Output" : "Enable Voice Output"}
        >
          {isSpeechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="hidden sm:inline">
            {isSpeechEnabled ? t('aiAssistant.speechOn') : t('aiAssistant.muted')}
          </span>
        </button>

        {/* Clear Chat Button */}
        {clearChat && messageCount > 1 && (
          <div className="relative">
            {!showConfirmClear ? (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/20 text-white/90 hover:text-rose-200 border border-white/15 transition-all cursor-pointer active:scale-95"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-rose-400/30">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  {t('aiAssistant.clearConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-1.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  {t('aiAssistant.cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ML Engine Badge */}
        <div className="hidden lg:flex items-center gap-1 text-emerald-300/80 text-[11px] font-medium px-2 py-1 bg-black/20 rounded-md border border-white/10">
          <Activity size={12} className="text-emerald-400" />
          <span>V2</span>
        </div>
      </div>
    </div>
  );
}

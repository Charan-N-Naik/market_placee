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
    <div className="relative bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0d9488] p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xl shrink-0 border-b border-emerald-500/20">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left: Avatar & Title */}
      <div className="flex items-center gap-3.5 relative z-10">
        <div className="relative">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-lg">
            <Bot size={26} className="text-white drop-shadow-md" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#047857] shadow-sm flex items-center justify-center">
            <span className="w-full h-full rounded-full bg-emerald-300 animate-ping opacity-75" />
          </span>
        </div>

        <div>
          <h3 className="text-white font-extrabold text-base sm:text-lg flex items-center gap-2 tracking-tight">
            {t('aiAssistant.voiceAiTitle')}
            <Sparkles size={16} className="text-amber-300 animate-pulse" />
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-emerald-100/90 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isListening 
                ? t('aiAssistant.listening') 
                : activeSpeakingId 
                  ? t('aiAssistant.speaking')
                  : t('aiAssistant.readyActive')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Active Speech Playing Indicator */}
        {activeSpeakingId && (
          <button
            type="button"
            onClick={stopSpeaking}
            className="p-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 border border-amber-300/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
            title="Stop Speech"
          >
            <Square size={13} className="fill-amber-300" />
            <span className="hidden md:inline">{t('aiAssistant.stopAudio')}</span>
          </button>
        )}

        <LanguageToggle className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20 text-xs font-bold" />
        
        <button 
          type="button"
          onClick={handleToggleSpeech}
          aria-pressed={isSpeechEnabled}
          className={`p-2.5 rounded-xl transition-all duration-300 active:scale-95 flex items-center gap-1.5 border ${
            isSpeechEnabled 
              ? 'bg-white/20 text-white border-white/30 shadow-md hover:bg-white/30' 
              : 'bg-rose-500/20 text-rose-200 border-rose-400/40 hover:bg-rose-500/30'
          }`}
          title={isSpeechEnabled ? "Disable Voice Output" : "Enable Voice Output"}
        >
          {isSpeechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="text-[11px] font-bold hidden sm:inline">
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
                className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-200 border border-white/20 hover:border-rose-400/40 transition-all cursor-pointer active:scale-95"
                title="Clear Chat History"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-rose-400/40 animate-fade-in">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {t('aiAssistant.clearConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {t('aiAssistant.cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 bg-black/20 border border-white/15 text-emerald-200 text-[10px] px-3 py-1.5 rounded-full uppercase font-black tracking-wider">
          <Activity size={12} className="text-emerald-400 animate-pulse" />
          {t('aiAssistant.mlEngine')}
        </div>
      </div>
    </div>
  );
}

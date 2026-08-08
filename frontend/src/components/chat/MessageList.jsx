import ChatMessage from './ChatMessage';
import { Bot, Mic, Activity, TrendingUp, Bug, CloudSun, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function MessageList({ messages, isLoading, isListening, onSpeak, activeSpeakingId, messagesEndRef }) {
  const { lang } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-slate-50/50 via-emerald-50/20 to-white custom-scrollbar">
      
      {/* Welcome Banner if few messages */}
      {(!messages || messages.length <= 1) && (
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border border-emerald-200/80 rounded-3xl p-5 sm:p-6 text-center space-y-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center mx-auto shadow-md border border-white/40">
            <Bot size={26} />
          </div>
          <h4 className="font-extrabold text-emerald-950 text-base sm:text-lg">
            🌾 {lang === 'kn' ? 'ಉತ್ತಮ ಕೃಷಿಗಾಗಿ ಕಿಸಾನ್‌ಮಿತ್ರ ಧ್ವನಿ ಸಹಾಯಕಿ' : 'Welcome to KisanMitra Voice AI Assistant'}
          </h4>
          <p className="text-xs sm:text-sm text-emerald-900/80 font-medium max-w-lg mx-auto leading-relaxed">
            {lang === 'kn'
              ? 'ಬೆಳೆ ಬೆಲೆಗಳು, ಕೀಟ ನಿಯಂತ್ರಣ, ನೀರಾವರಿ, ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಮಾಹಿತಿಗಾಗಿ ಕೇಳಿ. ಮೈಕ್ರೋಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ!'
              : 'Get instant AI advice on crop pricing, disease remedies, weather forecasts, and state subsidies. Tap the microphone below to talk live in Kannada or English!'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 max-w-xl mx-auto">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center gap-1 shadow-xs">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-[11px] font-bold text-gray-700">{lang === 'kn' ? 'ಮಂಡಿ ಬೆಲೆಗಳು' : 'Live Mandi Rates'}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center gap-1 shadow-xs">
              <Bug size={16} className="text-amber-600" />
              <span className="text-[11px] font-bold text-gray-700">{lang === 'kn' ? 'ರೋಗ ನಿಯಂತ್ರಣ' : 'Pest Solutions'}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center gap-1 shadow-xs">
              <CloudSun size={16} className="text-teal-600" />
              <span className="text-[11px] font-bold text-gray-700">{lang === 'kn' ? 'ಹವಾಮಾನ' : 'Agri Weather'}</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center gap-1 shadow-xs">
              <ShieldCheck size={16} className="text-blue-600" />
              <span className="text-[11px] font-bold text-gray-700">{lang === 'kn' ? 'ಸರ್ಕಾರಿ ಯೋಜನೆ' : 'Govt Schemes'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Render Conversation */}
      {(messages || []).map((msg, i) => (
        <ChatMessage 
          key={msg.id || i} 
          msg={msg} 
          onSpeak={onSpeak} 
          activeSpeakingId={activeSpeakingId}
          i={i} 
        />
      ))}
      
      {/* Active Speech Recognition Visualizer */}
      {isListening && (
        <div className="bg-emerald-900 text-white rounded-2xl p-4 shadow-xl border border-emerald-500/40 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0 shadow-lg text-white animate-bounce">
            <Mic size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                {lang === 'kn' ? 'ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ...' : 'Listening to your voice...'}
              </span>
              <Activity size={14} className="text-emerald-400 animate-spin" />
            </div>
            <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
              {lang === 'kn' ? 'ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ. ನೀವು ನಿಲ್ಲಿಸಿದ ತಕ್ಷಣ ಪ್ರಶ್ನೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.' : 'Speak clearly. Your query will auto-submit when you stop.'}
            </p>
          </div>
          {/* Animated waveform bars */}
          <div className="flex items-center gap-1 h-6">
            <span className="w-1 bg-amber-400 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms] h-4" />
            <span className="w-1 bg-teal-300 rounded-full animate-[bounce_1s_infinite_200ms] h-6" />
            <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms] h-3" />
          </div>
        </div>
      )}

      {/* AI Processing State */}
      {isLoading && (
        <div className="flex gap-3 sm:gap-4 animate-fade-in">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md border border-emerald-500/30">
            <Bot size={20} className="animate-spin" />
          </div>
          <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
            <span className="text-xs font-extrabold text-emerald-800">
              {lang === 'kn' ? 'ಕಿಸಾನ್‌ಮಿತ್ರ ಯೋಚಿಸುತ್ತಿದೆ...' : 'KisanMitra is thinking...'}
            </span>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
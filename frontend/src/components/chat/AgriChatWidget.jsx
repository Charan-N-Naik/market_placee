import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAgriAdvisoryChat } from '../../hooks/useAgriAdvisoryChat';
import { useAuth } from '../../context/AuthContext';

export function AgriChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const {
    messages,
    input,
    setInput,
    lang,
    setLang,
    isLoading,
    isRecording,
    isTranscribing,
    recordingTime,
    activeAudioId,
    sendMessage,
    startRecording,
    stopRecording,
    playAudioResponse,
    stopAudioPlayback,
    messagesEndRef,
    isSpeechEnabled,
    setIsSpeechEnabled,
  } = useAgriAdvisoryChat();

  // Role detection: prioritize user.role, then fallback to current route
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const role = user?.role || (currentPath.includes('/delivery') ? 'delivery_agent' : currentPath.includes('/buyer') ? 'buyer' : 'farmer');
  const isAgent = role === 'delivery_agent' || role === 'delivery';
  const isBuyer = role === 'buyer';

  // Dynamic role-based themes matching landing page login buttons:
  // Farmer -> Green (#16a34a)
  // Buyer -> Orange (#ea580c)
  // Delivery Agent -> Teal (#0d9488)
  const theme = isAgent
    ? {
        fabGradient: 'from-teal-600 via-teal-500 to-cyan-600',
        fabBorder: 'border-teal-400',
        fabDotPing: 'bg-cyan-400',
        fabDot: 'bg-teal-500',
        headerGradient: 'from-teal-700 via-teal-600 to-cyan-700',
        headerIconText: 'text-teal-200',
        badgeBg: 'bg-teal-400/20 text-teal-200 border-teal-400/30',
        audioActive: 'bg-teal-600/50 border-teal-400 text-white',
        audioInactive: 'bg-white/10 border-white/10 text-teal-200 hover:bg-white/20',
        globeIcon: 'text-teal-600',
        langActive: 'bg-teal-700 text-white shadow-md',
        userBubble: 'bg-gradient-to-tr from-teal-700 to-cyan-700 text-white border-teal-600',
        verifiedText: 'text-teal-700',
        verifiedIcon: 'text-teal-600',
        listenBtn: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
        loadingText: 'text-teal-700 bg-teal-50/80 border-teal-200/50',
        loadingSpinner: 'text-teal-600',
        micHover: 'hover:text-teal-700',
        inputFocus: 'focus:border-teal-600',
        sendBtn: 'bg-gradient-to-tr from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500',
      }
    : isBuyer
    ? {
        fabGradient: 'from-orange-500 via-amber-500 to-orange-600',
        fabBorder: 'border-orange-400',
        fabDotPing: 'bg-amber-400',
        fabDot: 'bg-orange-500',
        headerGradient: 'from-orange-600 via-amber-600 to-orange-600',
        headerIconText: 'text-orange-200',
        badgeBg: 'bg-orange-400/20 text-orange-200 border-orange-400/30',
        audioActive: 'bg-orange-600/50 border-orange-400 text-white',
        audioInactive: 'bg-white/10 border-white/10 text-orange-200 hover:bg-white/20',
        globeIcon: 'text-orange-500',
        langActive: 'bg-orange-600 text-white shadow-md',
        userBubble: 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white border-orange-500',
        verifiedText: 'text-orange-700',
        verifiedIcon: 'text-orange-600',
        listenBtn: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
        loadingText: 'text-orange-700 bg-orange-50/80 border-orange-200/50',
        loadingSpinner: 'text-orange-600',
        micHover: 'hover:text-orange-600',
        inputFocus: 'focus:border-orange-500',
        sendBtn: 'bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400',
      }
    : {
        fabGradient: 'from-green-600 via-emerald-600 to-teal-500',
        fabBorder: 'border-green-400',
        fabDotPing: 'bg-green-400',
        fabDot: 'bg-emerald-500',
        headerGradient: 'from-green-700 via-emerald-700 to-teal-600',
        headerIconText: 'text-green-200',
        badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
        audioActive: 'bg-emerald-600/50 border-emerald-400 text-white',
        audioInactive: 'bg-white/10 border-white/10 text-green-200 hover:bg-white/20',
        globeIcon: 'text-green-600',
        langActive: 'bg-green-700 text-white shadow-md',
        userBubble: 'bg-gradient-to-tr from-green-700 to-emerald-600 text-white border-green-600',
        verifiedText: 'text-emerald-700',
        verifiedIcon: 'text-emerald-600',
        listenBtn: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
        loadingText: 'text-green-700 bg-green-50/80 border-green-200/50',
        loadingSpinner: 'text-green-600',
        micHover: 'hover:text-green-700',
        inputFocus: 'focus:border-green-600',
        sendBtn: 'bg-gradient-to-tr from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500',
      };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      stopAudioPlayback();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end gap-3">
      {/* Floating Action Button (FAB) — only visible when closed */}
      {!isOpen && (
        <div className="relative group">
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg border border-gray-800">
            {lang === 'kn' ? 'ಕಿಸಾನ್ ಮಿತ್ರ AI ಸಹಾಯಕಿ' : 'KisanMitra AI Assistant'}
          </span>
          <button
            onClick={toggleWidget}
            className={`shadow-2xl transition-all duration-300 flex items-center justify-center relative cursor-pointer w-14 h-14 rounded-full border-2 bg-gradient-to-tr ${theme.fabGradient} ${theme.fabBorder} text-white hover:scale-105 active:scale-95 animate-bounce`}
            style={{ animationDuration: '4s' }}
            aria-label="Toggle Assistant"
          >
            <Bot className="w-6 h-6" />
            
            {/* Pulse notification dot */}
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.fabDotPing} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${theme.fabDot}`}></span>
            </span>
          </button>
        </div>
      )}

      {/* Slide-in Chat Widget panel */}
      {isOpen && (
        <div className="w-[95vw] sm:w-[420px] h-[550px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-out transform translate-y-0 scale-100 animate-fadeIn">
          {/* Header */}
          <div className={`bg-gradient-to-r ${theme.headerGradient} p-4 flex items-center justify-between shadow-md`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                <Bot className={`w-5 h-5 ${theme.headerIconText}`} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                  KisanMitra AI
                  <span className={`text-[9px] ${theme.badgeBg} px-2 py-0.5 rounded-full uppercase tracking-widest font-black`}>
                    Live RAG
                  </span>
                </h3>
                <p className="text-xs text-white/90 font-medium">
                  {lang === 'kn' ? 'ಲೈವ್ ಅಸಿಸ್ಟೆಂಟ್' : 'Real-time Assistant'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Audio Toggle switch in Header */}
              <button
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                  isSpeechEnabled 
                    ? theme.audioActive 
                    : theme.audioInactive
                }`}
                title={isSpeechEnabled ? "Mute Speech Response" : "Unmute Speech Response"}
              >
                {isSpeechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Close Button in Header */}
              <button
                onClick={toggleWidget}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors cursor-pointer"
                title={lang === 'kn' ? 'ಮುಚ್ಚಿ' : 'Close'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sub-header Language Switcher Bar */}
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200 text-xs">
            <span className="text-gray-500 font-bold flex items-center gap-1">
              <Globe className={`w-3.5 h-3.5 ${theme.globeIcon}`} /> 
              {lang === 'kn' ? 'ಭಾಷೆ:' : 'Language:'}
            </span>
            <div className="flex gap-1.5">
              {[
                { code: 'en', label: 'English' },
                { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' }
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    lang === l.code
                      ? theme.langActive
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Log Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 scrollbar-thin scrollbar-thumb-gray-250">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs md:text-sm shadow-sm leading-relaxed border transition-all ${
                      isUser
                        ? `${theme.userBubble} rounded-tr-none`
                        : msg.isError
                          ? 'bg-red-50 text-red-800 border-red-200 rounded-tl-none'
                          : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line font-medium">{msg.content}</p>

                    {/* Speech response play control inside message (for bot messages only) */}
                    {!isUser && !msg.isError && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                        <span className={`flex items-center gap-1 ${theme.verifiedText} font-bold`}>
                          <CheckCircle2 className={`w-3 h-3 ${theme.verifiedIcon}`} />
                          {lang === 'kn' ? 'ಲೈವ್ ದೃಢೀಕೃತ' : 'Live Verified'}
                        </span>
                        
                        <button
                          onClick={() => {
                            if (activeAudioId === msg.id) {
                              stopAudioPlayback();
                            } else {
                              playAudioResponse(null, msg.content, lang, msg.id);
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black transition-all cursor-pointer ${
                            activeAudioId === msg.id
                              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                              : theme.listenBtn
                          }`}
                        >
                          {activeAudioId === msg.id ? (
                            <>
                              <VolumeX size={12} />
                              {lang === 'kn' ? 'ನಿಲ್ಲಿಸು' : 'Stop'}
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} />
                              {lang === 'kn' ? 'ಕೇಳಿ' : 'Listen'}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-gray-400 font-bold mt-1 px-1.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Waiting indicator */}
            {isLoading && (
              <div className={`flex items-center gap-2 ${theme.loadingText} text-xs font-bold p-3 rounded-2xl w-max animate-pulse`}>
                <Sparkles className={`w-4 h-4 animate-spin ${theme.loadingSpinner}`} />
                <span>
                  {lang === 'kn' ? 'ಲೈವ್ ದಾಖಲೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...' : 'Fetching live database records...'}
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-gray-200">
            {isTranscribing ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-blue-700 text-xs animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>
                    {lang === 'kn' ? 'ಧ್ವನಿಯನ್ನು ಪಠ್ಯವಾಗಿಸಲಾಗುತ್ತಿದೆ (AI STT)...' : 'Transcribing voice with AI...'}
                  </span>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-700 text-xs animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>
                    {lang === 'kn' ? `ಧ್ವನಿ ಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ (${recordingTime}s)...` : `Listening to voice (${recordingTime}s)...`}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-black transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" /> 
                  {lang === 'kn' ? 'ನಿಲ್ಲಿಸಿ' : 'Stop'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className={`p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 ${theme.micHover} rounded-xl border border-gray-250 transition-colors cursor-pointer`}
                  title={lang === 'kn' ? 'ಮಾತನಾಡಿ' : 'Voice Input'}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    lang === 'kn' 
                      ? 'ದಾಸ್ತಾನು ಅಥವಾ ಬೆಳೆ ಬೆಲೆ ವಿವರಗಳ ಬಗ್ಗೆ ಕೇಳಿ...' 
                      : 'Ask about crop prices, stocks, or orders...'
                  }
                  className={`flex-1 bg-gray-50 border border-gray-250 text-gray-900 placeholder-gray-400 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none ${theme.inputFocus} focus:bg-white transition-all shadow-inner`}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  title={isLoading ? (lang === 'kn' ? "ಹೊಸ ಪ್ರಶ್ನೆ ಕಳುಹಿಸಿ" : "Send prompt") : (lang === 'kn' ? "ಕಳುಹಿಸಿ" : "Send")}
                  className={`p-2.5 ${theme.sendBtn} disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition-all shadow-md cursor-pointer active:scale-95`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgriChatWidget;

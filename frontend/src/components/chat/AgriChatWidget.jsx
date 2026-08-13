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

export function AgriChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    input,
    setInput,
    lang,
    setLang,
    isLoading,
    isRecording,
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
      {/* Floating Action Button (FAB) — always persistent */}
      <div className="relative group">
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg border border-gray-800">
          {lang === 'kn' ? 'ಕಿಸಾನ್ ಮಿತ್ರ AI ಸಹಾಯಕಿ' : 'KisanMitra AI Assistant'}
        </span>
        <button
          onClick={toggleWidget}
          className={`w-14 h-14 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center relative cursor-pointer border-2
            ${isOpen 
              ? 'bg-rose-500 hover:bg-rose-600 border-rose-400 text-white' 
              : 'bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-500 border-green-400 text-white animate-bounce'
            }
          `}
          style={{ animationDuration: '4s' }}
          aria-label="Toggle Assistant"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          
          {/* Pulse notification dot */}
          {!isOpen && (
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Chat Widget panel */}
      {isOpen && (
        <div className="w-[95vw] sm:w-[420px] h-[550px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-out transform translate-y-0 scale-100 animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 via-emerald-700 to-teal-600 p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                <Bot className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                  KisanMitra AI
                  <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-widest font-black">
                    Live RAG
                  </span>
                </h3>
                <p className="text-xs text-green-100/90 font-medium">
                  {lang === 'kn' ? 'ಲೈವ್ ಅಸಿಸ್ಟೆಂಟ್' : 'Real-time Assistant'}
                </p>
              </div>
            </div>
            
            {/* Audio Toggle switch in Header */}
            <button
              onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
              className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                isSpeechEnabled 
                  ? 'bg-emerald-600/50 border-emerald-400 text-white' 
                  : 'bg-white/10 border-white/10 text-green-200 hover:bg-white/20'
              }`}
              title={isSpeechEnabled ? "Mute Speech Response" : "Unmute Speech Response"}
            >
              {isSpeechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {/* Sub-header Language Switcher Bar */}
          <div className="bg-gray-550/50 bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200 text-xs">
            <span className="text-gray-500 font-bold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-green-600" /> 
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
                      ? 'bg-green-700 text-white shadow-md'
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
                        ? 'bg-gradient-to-tr from-green-700 to-emerald-600 text-white rounded-tr-none border-green-600'
                        : msg.isError
                          ? 'bg-red-50 text-red-800 border-red-200 rounded-tl-none'
                          : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line font-medium">{msg.content}</p>

                    {/* Speech response play control inside message (for bot messages only) */}
                    {!isUser && !msg.isError && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {lang === 'kn' ? 'ಲೈವ್ ದೃಢೀಕೃತ' : 'Live Verified'}
                        </span>
                        
                        <button
                          onClick={() => {
                            if (activeAudioId === msg.id) {
                              stopAudioPlayback();
                            } else {
                              playAudioResponse(null, msg.content, msg.detectedLang || lang, msg.id);
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black transition-all cursor-pointer ${
                            activeAudioId === msg.id
                              ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse'
                              : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
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
              <div className="flex items-center gap-2 text-green-700 text-xs font-bold bg-green-50/80 p-3 rounded-2xl w-max border border-green-200/50 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin text-green-600" />
                <span>
                  {lang === 'kn' ? 'ಲೈವ್ ಕೃಷಿ ದರಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...' : 'Fetching live database records...'}
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-gray-200">
            {isRecording ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-orange-700 text-xs animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                  <span>
                    {lang === 'kn' ? `ಧ್ವನಿ ಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ (${recordingTime}s)...` : `Listening to voice (${recordingTime}s)...`}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-black transition-colors cursor-pointer"
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
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-green-700 rounded-xl border border-gray-250 transition-colors cursor-pointer"
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
                  className="flex-1 bg-gray-550/30 bg-gray-50 border border-gray-250 text-gray-900 placeholder-gray-400 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus:border-green-600 focus:bg-white transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-gradient-to-tr from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
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

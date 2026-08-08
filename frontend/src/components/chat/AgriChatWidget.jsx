import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  FileText, 
  X, 
  MessageSquare,
  Globe,
  CheckCircle2,
  AlertTriangle
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
  } = useAgriAdvisoryChat();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'tcy', label: 'ತುಳು (Tulu)' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end gap-3">
      {/* Floating Action Button — small circle, no overlap */}
      {!isOpen && (
        <div className="relative group">
          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
            KisanMitra AI Advisory
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-emerald-400/40 flex items-center justify-center relative"
            aria-label="Open KisanMitra AI Assistant"
          >
            <Bot className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Embedded Chat Drawer Modal */}
      {isOpen && (
        <div className="w-[95vw] sm:w-[420px] h-[600px] max-h-[85vh] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 p-4 flex items-center justify-between border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                <Bot className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-100 flex items-center gap-1.5">
                  KisanMitra
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                    LIVE API
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80">Real-Time Multilingual Agri Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector Bar */}
          <div className="bg-slate-850 px-4 py-2 bg-slate-950/60 flex items-center justify-between border-b border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> Language:
            </span>
            <div className="flex gap-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    lang === l.code
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {l.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Message History Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/90 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-sm shadow-md transition-all ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {/* Text Response */}
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                  {/* Structured Render Card: Market Price */}
                  {msg.intent === 'market_price' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex justify-between items-center text-emerald-400 font-semibold border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Mandi Price Card
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded">
                          {msg.structuredData[0].provider}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Crop / Variety:</span>
                          <span className="font-semibold text-white">{msg.structuredData[0].crop} ({msg.structuredData[0].variety})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">APMC Market:</span>
                          <span className="font-semibold text-white">{msg.structuredData[0].market || msg.structuredData[0].district}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Modal Price:</span>
                          <span className="font-bold text-emerald-400 text-sm">₹{msg.structuredData[0].modalPrice} / Quintal</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Per Kg Rate:</span>
                          <span className="font-bold text-teal-300 text-sm">₹{msg.structuredData[0].pricePerKg} / kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Structured Render Card: Pesticide Advisory */}
                  {msg.intent === 'pesticide_advice' && msg.structuredData && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-amber-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold border-b border-slate-800 pb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> ICAR Approved Crop Protection
                      </div>
                      <div className="space-y-1.5 text-slate-300">
                        <p><span className="text-slate-400 font-medium">Approved Chemical:</span> <span className="text-white font-semibold">{msg.structuredData.approvedPesticide}</span></p>
                        <p><span className="text-slate-400 font-medium">Recommended Dosage:</span> <span className="text-amber-300 font-bold">{msg.structuredData.dosage}</span></p>
                        <p><span className="text-slate-400 font-medium">Safety Waiting Period:</span> <span className="text-slate-200">{msg.structuredData.waitingPeriodDays} days harvest interval</span></p>
                        <div className="bg-amber-950/40 p-2 rounded border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{msg.structuredData.disclaimer}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Structured Render Card: Government Schemes */}
                  {msg.intent === 'gov_scheme' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-cyan-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-cyan-400 font-semibold border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Government Scheme
                        </span>
                        <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded">
                          {msg.structuredData[0].category || 'Subsidy'}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-slate-300">
                        <p className="font-bold text-white text-sm">{msg.structuredData[0].schemeName}</p>
                        <p><span className="text-slate-400">Eligibility:</span> {msg.structuredData[0].eligibility}</p>
                        <p><span className="text-slate-400">Benefits:</span> <span className="text-cyan-300 font-medium">{msg.structuredData[0].benefits}</span></p>
                        {msg.structuredData[0].officialUrl && (
                          <a
                            href={msg.structuredData[0].officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 text-[11px] bg-cyan-600/30 text-cyan-200 hover:bg-cyan-600/50 px-2.5 py-1 rounded border border-cyan-400/30 transition-colors"
                          >
                            Apply on Official Portal ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Audio TTS Playback Trigger */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Fact Verified
                      </span>
                      <button
                        onClick={() =>
                          activeAudioId === msg.id
                            ? stopAudioPlayback()
                            : playAudioResponse(msg.audioOutput, msg.content, msg.detectedLang || lang, msg.id)
                        }
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 transition-all"
                      >
                        {activeAudioId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-400" /> Stop Audio
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" /> Listen Audio
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs bg-slate-800/80 p-3 rounded-2xl w-max border border-slate-700">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Fetching live market prices & ICAR advisories...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            {isRecording ? (
              <div className="flex items-center justify-between bg-amber-950/50 border border-amber-500/40 rounded-xl p-2.5 text-amber-300 text-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Recording voice input ({recordingTime}s)...</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="bg-amber-600 hover:bg-amber-500 text-white p-1.5 rounded-lg flex items-center gap-1 text-[11px] transition-colors"
                >
                  <Square className="w-3.5 h-3.5" /> Stop & Process
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
                  title="Speak query (Voice STT)"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask crop price, pesticide, or scheme..."
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-400 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
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

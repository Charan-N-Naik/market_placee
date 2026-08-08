import { useState } from 'react';
import { Bot, User, Volume2, Sparkles, CheckCheck, Copy, Check, VolumeX, AlertTriangle } from 'lucide-react';

// Simple lightweight formatter for AI Markdown responses
function FormattedContent({ text, isAssistant }) {
  if (!text) return null;

  // Split content by lines
  const lines = text.split('\n');

  return (
    <div className={`space-y-1.5 font-medium tracking-normal leading-relaxed text-sm sm:text-base ${
      isAssistant ? 'text-gray-800' : 'text-white'
    }`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Bullet point lines (- or * or •)
        if (/^[-*•]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 my-1 pl-1">
              <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isAssistant ? 'bg-emerald-600' : 'bg-emerald-200'}`} />
              <div>{renderFormattedText(bulletText)}</div>
            </div>
          );
        }

        // Numbered list lines (e.g., 1. 2.)
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (match) {
            const num = match[1];
            const itemText = match[2];
            return (
              <div key={idx} className="flex items-start gap-2 my-1 pl-1">
                <span className={`text-xs font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                  isAssistant ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600/60 text-white'
                }`}>
                  {num}
                </span>
                <div>{renderFormattedText(itemText)}</div>
              </div>
            );
          }
        }

        // Header lines (### or ##)
        if (/^#{1,4}\s+/.test(trimmed)) {
          const headerText = trimmed.replace(/^#{1,4}\s+/, '');
          return (
            <h5 key={idx} className={`font-extrabold text-sm sm:text-base mt-2 mb-1 ${
              isAssistant ? 'text-emerald-950 border-b border-emerald-100 pb-1' : 'text-amber-200'
            }`}>
              {renderFormattedText(headerText)}
            </h5>
          );
        }

        return <p key={idx}>{renderFormattedText(trimmed)}</p>;
      })}
    </div>
  );
}

// Parse inline bolding **text** or *text*
function renderFormattedText(text) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-extrabold text-emerald-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-emerald-800">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-800 text-xs font-mono border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function ChatMessage({ msg, onSpeak, isSpeaking, activeSpeakingId, i }) {
  const isAssistant = msg.role === 'assistant';
  const isCurrentlySpeaking = activeSpeakingId === msg.id;
  const [copied, setCopied] = useState(false);

  const formattedTime = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = () => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 animate-fade-in ${!isAssistant ? 'flex-row-reverse justify-start' : 'justify-start'}`}
      style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
    >
      {/* Avatar Badge */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md border ${
        isAssistant
          ? msg.isError 
            ? 'bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-400/30'
            : 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-500/30'
          : 'bg-gradient-to-br from-amber-500 to-emerald-700 text-white border-amber-400/30'
      }`}>
        {isAssistant ? (
          msg.isError ? <AlertTriangle size={20} /> : <Bot size={20} className="drop-shadow-sm" />
        ) : (
          <User size={20} className="drop-shadow-sm" />
        )}
      </div>

      {/* Message Content Card */}
      <div className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-sm border transition-all relative group ${
        isAssistant
          ? msg.isError
            ? 'bg-rose-50/90 border-rose-200 text-rose-950 rounded-tl-none shadow-rose-900/5'
            : 'bg-white border-emerald-100/90 text-gray-800 rounded-tl-none shadow-emerald-900/5 hover:shadow-emerald-900/10'
          : 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-600 rounded-tr-none shadow-emerald-900/10'
      }`}>
        {/* Header tag */}
        <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-gray-100/60">
          <span className={`text-[11px] font-black uppercase tracking-wider ${
            isAssistant 
              ? msg.isError ? 'text-rose-700 flex items-center gap-1.5' : 'text-emerald-700 flex items-center gap-1.5' 
              : 'text-emerald-200'
          }`}>
            {isAssistant ? (
              <><Sparkles size={12} className={msg.isError ? "text-rose-500" : "text-amber-500"} /> KisanMitra AI</>
            ) : (
              'You (Farmer)'
            )}
          </span>
          
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold ${isAssistant ? 'text-gray-400' : 'text-emerald-200/70'}`}>
              {formattedTime}
            </span>

            {/* Quick Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isAssistant 
                  ? 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50' 
                  : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
              }`}
              title="Copy message"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Text Body */}
        <FormattedContent text={msg.content} isAssistant={isAssistant} />

        {/* Footer controls for Assistant */}
        {isAssistant && !msg.isError && (
          <div className="mt-3.5 pt-2.5 border-t border-gray-100/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <CheckCheck size={13} /> Verified Agri Insights
            </span>
            
            <button 
              type="button"
              onClick={() => onSpeak && onSpeak(msg.content, msg.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 shadow-xs ${
                isCurrentlySpeaking
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title={isCurrentlySpeaking ? "Stop Reading" : "Read Aloud"}
            >
              {isCurrentlySpeaking ? (
                <>
                  <VolumeX size={14} />
                  <span>Stop</span>
                  {/* Waveform bars */}
                  <span className="flex items-center gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 h-full bg-white rounded-full animate-[bounce_1s_infinite_100ms]" />
                    <span className="w-0.5 h-2 bg-white rounded-full animate-[bounce_1s_infinite_200ms]" />
                    <span className="w-0.5 h-full bg-white rounded-full animate-[bounce_1s_infinite_300ms]" />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 size={14} className="text-emerald-600" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


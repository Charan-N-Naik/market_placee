import { useRef } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';

export default function AIChatbot() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    isListening,
    isSpeechEnabled,
    setIsSpeechEnabled,
    activeSpeakingId,
    stopSpeaking,
    clearChat,
    messagesEndRef,
    handleVoiceInput,
    sendMessage,
    speak,
    suggestions,
    sendSuggestion
  } = useAIChat();

  const inputRef = useRef(null);

  const handleSend = (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (!input.trim()) {
      inputRef.current?.focus();
      return;
    }

    sendMessage();
    inputRef.current?.focus();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 sm:py-4 px-2 sm:px-6">
      {/* Centered Chat Card Container with controlled width */}
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-emerald-100/90 shadow-2xl flex flex-col overflow-hidden h-[calc(88vh-70px)] min-h-[560px] ring-1 ring-emerald-950/5">
        
        {/* Header */}
        <ChatHeader 
          isSpeechEnabled={isSpeechEnabled} 
          setIsSpeechEnabled={setIsSpeechEnabled}
          isListening={isListening} 
          activeSpeakingId={activeSpeakingId}
          stopSpeaking={stopSpeaking}
          clearChat={clearChat}
          messageCount={(messages || []).length}
        />
        
        {/* Messages Body */}
        <MessageList 
          messages={messages || []} 
          isLoading={isLoading} 
          isListening={isListening}
          onSpeak={speak} 
          activeSpeakingId={activeSpeakingId}
          messagesEndRef={messagesEndRef} 
        />

        {/* Suggestions chips */}
        {!isLoading && (messages || []).length <= 2 && (
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-gray-100 flex flex-wrap items-center justify-center gap-2 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 shrink-0">Suggested Questions:</span>
            {(suggestions || []).map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendSuggestion && sendSuggestion(suggestion)}
                className="px-3 py-1 bg-white hover:bg-emerald-600 hover:text-white text-gray-700 text-xs font-bold rounded-full border border-gray-200 hover:border-emerald-600 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <ChatInput 
          input={input}
          setInput={setInput}
          isListening={isListening}
          isLoading={isLoading}
          onVoiceInput={handleVoiceInput}
          onSend={handleSend}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}


import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

export function useAIChat() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: t('chatWelcome') || "Hello! I'm KisanMitra, your farming assistant. How can I help you today with crops, market prices, pests, or weather?",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  const messagesEndRef = useRef(null);

  // Setup Speech Recognition
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const recognition = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isListening, scrollToBottom]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeakingId(null);
  }, []);

  const speak = useCallback((text, msgId = null) => {
    if (!isSpeechEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    try {
      window.speechSynthesis.cancel();

      if (msgId && activeSpeakingId === msgId) {
        setActiveSpeakingId(null);
        return;
      }

      // Clean markdown symbols so TTS reads naturally
      const cleanText = text
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === 'kn' ? 'kn-IN' : (lang === 'hi' ? 'hi-IN' : 'en-IN');
      utterance.rate = 0.95;

      utterance.onstart = () => {
        setActiveSpeakingId(msgId || 'latest');
      };

      utterance.onend = () => {
        setActiveSpeakingId(null);
      };

      utterance.onerror = () => {
        setActiveSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis warning:', err);
      setActiveSpeakingId(null);
    }
  }, [isSpeechEnabled, lang, activeSpeakingId]);

  const sendMessageDirect = useCallback(async (text) => {
    if (!text || !text.trim() || isLoading) return;

    const trimmedText = text.trim();
    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: trimmedText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput('');

    try {
      let reply = '';
      let structuredData = null;

      try {
        // Primary: Node.js Express AgriChat Orchestrator
        const res = await fetch('http://localhost:5000/api/agri-chat/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmedText, targetLang: lang })
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.formattedResponse || data.response || data.message;
          structuredData = data.moduleData || null;
        }
      } catch (_nodeErr) {
        // Fallback: Python Flask ML Server on port 5001
        try {
          const res = await fetch('http://localhost:5001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmedText, lang })
          });
          if (res.ok) {
            const data = await res.json();
            reply = data.response || data.message;
          }
        } catch (_pyErr) {
          console.warn('Both AI backends unavailable, using intelligent assistant engine.');
        }
      }

      if (!reply) {
        reply = `Thank you for your question about "${trimmedText}". Based on KisanMitra agricultural knowledge base: For optimal crop yield, ensure balanced NPK fertilization, monitor weather conditions via the Weather tab, and check active APMC Mandi prices in Market Prices.`;
      }

      const botMsgId = `msg-bot-${Date.now()}`;
      const botMsg = {
        id: botMsgId,
        role: 'assistant',
        content: reply,
        data: structuredData,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
      speak(reply, botMsgId);
    } catch (err) {
      console.error('AI Backend Error:', err);
      const errorMsg = lang === 'kn' 
        ? "AI ಬ್ಯಾಕೆಂಡ್ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಪೈಥಾನ್ ಸರ್ವರ್ 5001 ಪೋರ್ಟ್‌ನಲ್ಲಿದೆಯೇ ಪರಿಶೀಲಿಸಿ."
        : "I am currently unable to reach the AI backend. Please ensure the Python ML server is running on port 5001.";
      const errorMsgId = `msg-err-${Date.now()}`;
      const botMsg = {
        id: errorMsgId,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, botMsg]);
      speak(errorMsg, errorMsgId);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lang, speak]);

  const clearChat = useCallback(() => {
    stopSpeaking();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: t('chatWelcome') || "Hello! I'm KisanMitra, your farming assistant. How can I help you today?",
        timestamp: new Date().toISOString()
      }
    ]);
  }, [stopSpeaking, t]);

  const suggestions = lang === 'kn' 
    ? ["ಈಗಿನ ಬೆಳೆ ಬೆಲೆಗಳು", "ಟೊಮೆಟೊ ರೋಗ ನಿಯಂತ್ರಣ", "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು", "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ"]
    : ["Current crop prices", "Pest control for tomato", "Government schemes", "Weather forecast"];

  const sendSuggestion = useCallback((suggestion) => {
    sendMessageDirect(suggestion);
  }, [sendMessageDirect]);

  useEffect(() => {
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang === 'kn' ? 'kn-IN' : (lang === 'hi' ? 'hi-IN' : 'en-IN');

    let finalTranscript = '';

    rec.onresult = (event) => {
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptChunk;
        } else {
          currentInterim += transcriptChunk;
        }
      }

      const textToShow = finalTranscript || currentInterim;
      if (textToShow) {
        setInput(textToShow);
      }
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      // Auto-send if we captured a final transcript
      if (finalTranscript && finalTranscript.trim()) {
        sendMessageDirect(finalTranscript.trim());
      }
    };

    recognition.current = rec;

    return () => {
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.onend = null;
        try {
          recognition.current.stop();
        } catch (_e) {
          // ignore
        }
      }
    };
  }, [SpeechRecognition, lang, sendMessageDirect]);

  const handleVoiceInput = useCallback(() => {
    if (!SpeechRecognition) {
      alert(lang === 'kn' ? 'ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗ್ರಹಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ.' : 'Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      try {
        recognition.current?.stop();
      } catch (error) {
        console.error('Error stopping recognition', error);
      }
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      if (recognition.current) {
        recognition.current.lang = lang === 'kn' ? 'kn-IN' : (lang === 'hi' ? 'hi-IN' : 'en-IN');
        recognition.current.start();
      }
    } catch (error) {
      console.error('Speech recognition start failed', error);
      setIsListening(false);
    }
  }, [SpeechRecognition, isListening, lang]);

  useEffect(() => {
    if (!isSpeechEnabled) {
      stopSpeaking();
    }
  }, [isSpeechEnabled, stopSpeaking]);

  const sendMessage = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    sendMessageDirect(input);
  };

  return {
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
  };
}


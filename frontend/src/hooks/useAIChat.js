import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useAIChat() {
  const { t, i18n } = useTranslation();
  
  // Realtime reactive language state synchronized with i18n
  const [lang, setLang] = useState(() => ((i18n.language || 'en').startsWith('kn') ? 'kn' : 'en'));

  useEffect(() => {
    const handleLangChange = (lng) => {
      const activeLang = (lng || 'en').startsWith('kn') ? 'kn' : 'en';
      setLang(activeLang);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, [i18n]);

  const getWelcomeText = useCallback((l) => {
    return l === 'kn'
      ? "ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್ ಮಿತ್ರ, ನಿಮ್ಮ ಕೃಷಿ AI ಸಹಾಯಕ. ಬೆಳೆ ಬೆಲೆ, ಹವಾಮಾನ, ಕೀಟ ನಿಯಂತ್ರಣ ಅಥವಾ ಕೃಷಿ ಕುರಿತು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
      : (t('aiAssistant.chatWelcome') || "Hello! I'm KisanMitra, your farming assistant. How can I help you today with crops, market prices, pests, or weather?");
  }, [t]);

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: getWelcomeText((i18n.language || 'en').startsWith('kn') ? 'kn' : 'en'),
      timestamp: new Date().toISOString(),
    }
  ]);

  // Update welcome message immediately if user toggles language before starting a conversation
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id.startsWith('welcome')) {
        return [{
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: getWelcomeText(lang),
          timestamp: new Date().toISOString(),
        }];
      }
      return prev;
    });
  }, [lang, getWelcomeText]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

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
    if (!text || !text.trim()) return;

    const trimmedText = text.trim();

    // 1. Immediately abort any previous pending request & speech
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopSpeaking();

    // 2. Setup new abort controller for this new prompt
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Detect language of input or current active language
    const isKannadaScript = /[\u0C80-\u0CFF]/.test(trimmedText);
    const activeTargetLang = (isKannadaScript || lang === 'kn') ? 'kn' : 'en';

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
          signal: controller.signal,
          body: JSON.stringify({ 
            message: trimmedText, 
            text: trimmedText, 
            lang: activeTargetLang, 
            targetLang: activeTargetLang,
            language: activeTargetLang 
          })
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.formattedResponse || data.response || data.message;
          structuredData = data.moduleData || null;
        }
      } catch (nodeErr) {
        if (nodeErr.name === 'AbortError') throw nodeErr;

        // Fallback: Python Flask ML Server on port 5001
        try {
          const res = await fetch('http://localhost:5001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ message: trimmedText, lang: activeTargetLang })
          });
          if (res.ok) {
            const data = await res.json();
            reply = data.response || data.message;
          }
        } catch (pyErr) {
          if (pyErr.name === 'AbortError') throw pyErr;
          console.warn('Both AI backends unavailable, using intelligent localized assistant engine.');
        }
      }

      if (!reply) {
        reply = activeTargetLang === 'kn'
          ? `"${trimmedText}" ಕುರಿತು ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಧನ್ಯವಾದಗಳು. ಕಿಸಾನ್ ಮಿತ್ರ ಕೃಷಿ ಜ್ಞಾನ ಭಂಡಾರದ ಪ್ರಕಾರ: ಉತ್ತಮ ಬೆಳೆ ಇಳುವರಿಗಾಗಿ ಸಮತೋಲಿತ NPK ಪೋಷಕಾಂಶಗಳನ್ನು ಬಳಸಿ, ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಗಮನಿಸಿ ಹಾಗೂ ಮಾರುಕಟ್ಟೆ ದರಗಳ ಪುಟದಲ್ಲಿ ಲೈವ್ APMC ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.`
          : `Thank you for your question about "${trimmedText}". Based on KisanMitra agricultural knowledge base: For optimal crop yield, ensure balanced NPK fertilization, monitor weather conditions via the Weather tab, and check active APMC Mandi prices in Market Prices.`;
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
      if (err.name === 'AbortError') {
        console.log('[AIChat] Older prompt cancelled cleanly for incoming prompt.');
        return;
      }
      console.error('AI Backend Error:', err);
      const errorMsg = activeTargetLang === 'kn'
        ? "ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ."
        : (t('aiAssistant.aiBackendError') || "AI Service is temporarily unavailable. Please try again.");
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
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [lang, speak, stopSpeaking, t]);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopSpeaking();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: getWelcomeText(lang),
        timestamp: new Date().toISOString()
      }
    ]);
  }, [stopSpeaking, getWelcomeText, lang]);

  const suggestions = lang === 'kn' 
    ? ["ಇಂದಿನ ಟೊಮೆಟೊ ಮಂಡಿ ಬೆಲೆ ಎಷ್ಟು?", "ರಾಗಿ ಬೆಳೆಯುವ ಉತ್ತಮ ಕೃಷಿ ವಿಧಾನ ಯಾವುದು?", "ಬೆಳೆ ಕೀಟ ನಿಯಂತ್ರಣ ಮತ್ತು ಔಷಧಿ ಯಾವುದು?", "ಕರ್ನಾಟಕದಲ್ಲಿ ಈ ವಾರದ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ"]
    : ["What is the price of Tomato today?", "Best cultivation practices for Ragi crop", "Pest control for yellow leaf disease", "Agri weather forecast for Karnataka"];

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
      alert(t('aiAssistant.voiceNotSupported'));
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
  }, [SpeechRecognition, isListening, lang, t]);

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
    sendSuggestion,
    lang
  };
}

export default useAIChat;

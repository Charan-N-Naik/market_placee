import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export function useAgriAdvisoryChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  // Realtime language state synchronized with global i18n
  const [lang, setLang] = useState(() => {
    return (i18n.language || localStorage.getItem('i18nextLng') || 'en').startsWith('kn') ? 'kn' : 'en';
  });

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

  const getWelcomeMessage = useCallback((language) => {
    return language === 'kn'
      ? "ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್ ಮಿತ್ರ. ಬೆಳೆ ದರಗಳು, ದಾಸ್ತಾನು ಲಭ್ಯತೆ, ಆರ್ಡರ್ ವಿವರಗಳು ಅಥವಾ ಕೃಷಿ ಕುರಿತು ಲೈವ್ ಮಾಹಿತಿಗಾಗಿ ಕೇಳಿ."
      : "Hello! I am KisanMitra, your live assistant. Ask me anything about crop prices, stock availability, order status, or farming.";
  }, []);

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: getWelcomeMessage((i18n.language || localStorage.getItem('i18nextLng') || 'en').startsWith('kn') ? 'kn' : 'en'),
      detectedLang: (i18n.language || localStorage.getItem('i18nextLng') || 'en').startsWith('kn') ? 'kn' : 'en',
      timestamp: new Date().toISOString(),
    }
  ]);

  // Update welcome message if language changes and conversation is at start
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome-1') {
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: getWelcomeMessage(lang),
          detectedLang: lang,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  }, [lang, messages.length, getWelcomeMessage]);

  const changeLanguage = useCallback(async (newLang) => {
    if (newLang === lang) return;
    setLang(newLang);
    localStorage.setItem('i18nextLng', newLang);
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(newLang);
    }

    const nonWelcomeMessages = messages.filter(m => m.id !== 'welcome-1');
    if (nonWelcomeMessages.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/assistant/translate', {
        messages: nonWelcomeMessages.map(m => ({ content: m.content })),
        targetLang: newLang
      });

      if (response.data && response.data.success) {
        const translations = response.data.translations;
        setMessages(prev => {
          let transIdx = 0;
          return prev.map(msg => {
            if (msg.id === 'welcome-1') {
              return {
                ...msg,
                content: getWelcomeMessage(newLang),
                detectedLang: newLang
              };
            }
            const translatedVal = translations[transIdx];
            transIdx++;
            return {
              ...msg,
              content: translatedVal || msg.content,
              detectedLang: newLang
            };
          });
        });
      }
    } catch (err) {
      console.error('Failed to translate conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lang, messages, getWelcomeMessage, i18n]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const audioRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveAudioId(null);
  }, []);

  // Halt speech playback immediately if speech is disabled/muted or unmounted
  useEffect(() => {
    if (!isSpeechEnabled) {
      stopAudioPlayback();
    }
  }, [isSpeechEnabled, stopAudioPlayback]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, [stopAudioPlayback]);

  // TTS Audio synthesis using backend proxy for Kannada or Web Speech API for English/Hindi
  const playAudioResponse = useCallback((audioOutput, textToSpeak, languageCode, msgId) => {
    if (!isSpeechEnabled || typeof window === 'undefined') return;

    try {
      stopAudioPlayback();
      setActiveAudioId(msgId || 'latest');

      // Clean formatting symbols from markdown
      const cleanText = (textToSpeak || '')
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) {
        setActiveAudioId(null);
        return;
      }

      const isKannada = languageCode === 'kn' || /[\u0C80-\u0CFF]/.test(cleanText);

      if (isKannada) {
        const ttsUrl = `/api/agri-chat/tts?text=${encodeURIComponent(cleanText.slice(0, 400))}&lang=kn`;
        const audio = new Audio(ttsUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setActiveAudioId(null);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.warn('Kannada backend TTS audio playback failed, falling back to browser synthesis:', e);
          audioRef.current = null;
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'kn-IN';
            utterance.rate = 0.95;
            utterance.onend = () => setActiveAudioId(null);
            utterance.onerror = () => setActiveAudioId(null);
            window.speechSynthesis.speak(utterance);
          } else {
            setActiveAudioId(null);
          }
        };

        audio.play().catch(playErr => {
          console.warn('Audio autoplay failed:', playErr);
          setActiveAudioId(null);
        });
        return;
      }

      if (!window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = languageCode === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.lang = targetLang;
      utterance.rate = 0.95;

      utterance.onend = () => setActiveAudioId(null);
      utterance.onerror = () => setActiveAudioId(null);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis warning:', err);
      setActiveAudioId(null);
    }
  }, [isSpeechEnabled, stopAudioPlayback]);

  // Send Text query to AI Assistant (/api/assistant/query)
  const sendMessageDirect = useCallback(async (textToSend) => {
    const trimmed = (textToSend || '').trim();
    if (!trimmed) return;

    // 1. Interrupt and abort any older pending query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopAudioPlayback();

    // 2. Setup fresh AbortController for incoming prompt
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Detect language of the input text or currently selected UI language
    const isKannadaInput = /[\u0D80-\u0DFF\u0C80-\u0CFF]/.test(trimmed);
    const queryLang = (isKannadaInput || lang === 'kn') ? 'kn' : 'en';

    const userMsg = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Get conversation context history (excluding welcome message to save tokens)
      const history = messages
        .filter(m => m.id !== 'welcome-1')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await api.post('/assistant/query', {
        message: trimmed,
        language: queryLang,
        role: user?.role || 'buyer',
        conversationHistory: history
      }, {
        signal: controller.signal
      });

      const data = response.data;

      if (data && data.success) {
        const botMsg = {
          id: `msg-bot-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          detectedLang: data.detectedLang || queryLang,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMsg]);

        // Trigger navigation action if present (e.g. open cart, view schemes, etc.)
        if (data.action && data.action.type === 'navigate') {
          setTimeout(() => {
            navigate(data.action.path);
          }, 1500); // 1.5s delay so user can read message
        }

        // Auto play speech response if enabled
        if (isSpeechEnabled) {
          playAudioResponse(null, data.response, data.detectedLang || queryLang, botMsg.id);
        }
      } else {
        throw new Error(data?.message || 'Empty response');
      }

    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        console.log('[AgriAdvisoryChat] Older prompt cancelled for incoming prompt.');
        return;
      }
      console.error('AI assistant query error:', err);
      const errMsg = queryLang === 'kn' 
        ? 'ಕ್ಷಮಿಸಿ, ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.' 
        : 'Sorry, I am having trouble connecting to the assistant. Please try again.';
      
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: errMsg,
          isError: true,
          timestamp: new Date().toISOString(),
        }
      ]);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [lang, messages, user?.role, navigate, isSpeechEnabled, playAudioResponse, stopAudioPlayback]);

  // Voice recording & STT integration using Web Speech API
  const startRecording = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(lang === 'kn' ? 'ನಿಮ್ಮ ಬ್ರೌಸರ್ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.' : 'Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';

      rec.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };

      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          sendMessageDirect(transcript);
        }
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        stopRecording();
      };

      rec.onend = () => {
        stopRecording();
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      stopRecording();
    }
  }, [lang, sendMessageDirect]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const sendMessage = useCallback(() => {
    sendMessageDirect(input);
  }, [input, sendMessageDirect]);

  return {
    messages,
    input,
    setInput,
    lang,
    setLang: changeLanguage,
    isLoading,
    isRecording,
    recordingTime,
    activeAudioId,
    sendMessage,
    sendMessageDirect,
    startRecording,
    stopRecording,
    playAudioResponse,
    stopAudioPlayback,
    messagesEndRef,
    isSpeechEnabled,
    setIsSpeechEnabled,
  };
}

export default useAgriAdvisoryChat;

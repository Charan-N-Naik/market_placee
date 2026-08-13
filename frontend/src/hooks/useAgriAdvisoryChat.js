import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export function useAgriAdvisoryChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Set default language based on local storage or 'en'
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('i18nextLng')?.startsWith('kn') ? 'kn' : 'en';
  });

  const getWelcomeMessage = useCallback((language) => {
    return language === 'kn'
      ? "ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್ ಮಿತ್ರ. ಬೆಳೆ ದರಗಳು, ದಾಸ್ತಾನು ಲಭ್ಯತೆ, ಆರ್ಡರ್ ವಿವರಗಳು ಅಥವಾ ಕೃಷಿ ಕುರಿತು ಲೈವ್ ಮಾಹಿತಿಗಾಗಿ ಕೇಳಿ."
      : "Hello! I am KisanMitra, your live assistant. Ask me anything about crop prices, stock availability, order status, or farming.";
  }, []);

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: getWelcomeMessage(localStorage.getItem('i18nextLng')?.startsWith('kn') ? 'kn' : 'en'),
      detectedLang: localStorage.getItem('i18nextLng')?.startsWith('kn') ? 'kn' : 'en',
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
  }, [lang, messages, getWelcomeMessage]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // TTS Audio synthesis using Web Speech API with Kannada voice support
  const playAudioResponse = useCallback((audioOutput, textToSpeak, languageCode, msgId) => {
    if (!isSpeechEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      setActiveAudioId(msgId);

      // Clean formatting symbols from markdown
      const cleanText = textToSpeak
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = languageCode === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.lang = targetLang;
      utterance.rate = 0.95;

      // Try to find native Kannada voice if available
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(languageCode));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => setActiveAudioId(null);
      utterance.onerror = () => setActiveAudioId(null);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis warning:', err);
      setActiveAudioId(null);
    }
  }, [isSpeechEnabled]);

  const stopAudioPlayback = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveAudioId(null);
  }, []);

  // Halt speech playback immediately if speech is disabled/muted
  useEffect(() => {
    if (!isSpeechEnabled) {
      stopAudioPlayback();
    }
  }, [isSpeechEnabled, stopAudioPlayback]);

  // Send Text query to Anthropic Claude (POST /api/assistant/query)
  const sendMessageDirect = useCallback(async (textToSend) => {
    const trimmed = (textToSend || '').trim();
    if (!trimmed || isLoading) return;

    // Detect language of the input text
    const isKannadaInput = /[\u0D80-\u0DFF\u0C80-\u0CFF]/.test(trimmed);
    const queryLang = isKannadaInput ? 'kn' : lang;

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
      });

      const data = response.data;
      setIsLoading(false);

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
      setIsLoading(false);
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
    }
  }, [isLoading, lang, messages, user, isSpeechEnabled, playAudioResponse, navigate]);

  const sendMessage = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    sendMessageDirect(input);
  }, [input, sendMessageDirect]);

  // STT Voice Recognition using Web Speech API
  const startRecording = useCallback(async () => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      stopAudioPlayback();
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';

      rec.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      };

      rec.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        if (resultText && resultText.trim()) {
          sendMessageDirect(resultText.trim());
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
      };

      rec.onend = () => {
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  }, [lang, sendMessageDirect, stopAudioPlayback]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // Handle voices loaded event in synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const handleVoices = () => {
        // Just triggers refresh of voices array internally
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
      };
    }
  }, []);

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

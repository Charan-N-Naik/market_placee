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

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const capturedTranscriptRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const audioRef = useRef(null);

  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

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

  // TTS Audio synthesis using backend proxy for both Kannada and English
  const playAudioResponse = useCallback((audioOutput, textToSpeak, languageCode, msgId) => {
    if (!isSpeechEnabled || typeof window === 'undefined') return;

    try {
      stopAudioPlayback();
      const currentId = msgId || 'latest';
      setActiveAudioId(currentId);

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

      // Centralized language setting is the single source of truth:
      // When English is selected -> always speak English.
      // When Kannada is selected -> always speak Kannada.
      const targetLang = (languageCode === 'kn' || languageCode === 'en') ? languageCode : lang;
      const isKannada = targetLang === 'kn';

      const ttsUrl = `/api/agri-chat/tts?text=${encodeURIComponent(cleanText.slice(0, 800))}&lang=${targetLang}`;
      const audio = new Audio(ttsUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setActiveAudioId(null);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.warn(`[TTS] Backend ${targetLang} TTS audio playback failed, falling back to browser synthesis:`, e);
        audioRef.current = null;
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = isKannada ? 'kn-IN' : 'en-IN';
          utterance.rate = 0.95;
          const voices = window.speechSynthesis.getVoices() || [];
          if (!isKannada) {
            const englishVoice = voices.find(v => v.lang === 'en-IN') || 
                                 voices.find(v => v.lang.startsWith('en')) || 
                                 voices.find(v => /english/i.test(v.name));
            if (englishVoice) utterance.voice = englishVoice;
          } else {
            const kannadaVoice = voices.find(v => v.lang === 'kn-IN' || v.lang.startsWith('kn') || /kannada/i.test(v.name));
            if (kannadaVoice) utterance.voice = kannadaVoice;
          }
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
    } catch (err) {
      console.warn('Speech synthesis warning:', err);
      setActiveAudioId(null);
    }
  }, [isSpeechEnabled, lang, stopAudioPlayback]);

  // Seamless Language Toggle:
  // 1. Immediately stops any ongoing speech audio.
  // 2. Switches content and active language to the new language (English or Kannada).
  // 3. If audio was speaking mid-sentence, resumes speech immediately in the new language!
  const changeLanguage = useCallback(async (newLang) => {
    if (newLang === lang) return;

    const wasAudioPlaying = !!activeAudioId;
    const playingMsgId = activeAudioId;

    // Cut off current audio immediately!
    stopAudioPlayback();

    setLang(newLang);
    localStorage.setItem('i18nextLng', newLang);
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(newLang);
    }

    const nonWelcomeMessages = messages.filter(m => m.id !== 'welcome-1');
    if (nonWelcomeMessages.length === 0) {
      const newWelcome = getWelcomeMessage(newLang);
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: newWelcome,
          detectedLang: newLang,
          timestamp: new Date().toISOString(),
        }
      ]);
      if (wasAudioPlaying) {
        playAudioResponse(null, newWelcome, newLang, 'welcome-1');
      }
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
        let speechCandidate = null;

        setMessages(prev => {
          let transIdx = 0;
          return prev.map(msg => {
            if (msg.id === 'welcome-1') {
              const updatedWelcome = getWelcomeMessage(newLang);
              if (playingMsgId === 'welcome-1') {
                speechCandidate = { content: updatedWelcome, id: 'welcome-1' };
              }
              return {
                ...msg,
                content: updatedWelcome,
                detectedLang: newLang
              };
            }
            const translatedVal = translations[transIdx];
            transIdx++;
            const newContent = translatedVal || msg.content;
            if (msg.role === 'assistant' && (msg.id === playingMsgId || !speechCandidate)) {
              speechCandidate = { content: newContent, id: msg.id };
            }
            return {
              ...msg,
              content: newContent,
              detectedLang: newLang
            };
          });
        });

        // Resume speech in the new language if audio was playing during toggle
        if (wasAudioPlaying && speechCandidate) {
          playAudioResponse(null, speechCandidate.content, newLang, speechCandidate.id);
        }
      }
    } catch (err) {
      console.error('Failed to translate conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lang, activeAudioId, messages, getWelcomeMessage, i18n, stopAudioPlayback, playAudioResponse]);

  // Update welcome message if language changes and conversation is at initial state
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

    // Language strictly follows the user's selected tab (lang state).
    // If user has English selected → always respond in English.
    // If user has Kannada selected → always respond in Kannada.
    const queryLang = lang;

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
          const targetPath = data.action.path;
          setTimeout(() => {
            navigate(targetPath);
            window.dispatchEvent(new CustomEvent('app:navigate', { detail: targetPath }));
          }, 1200); // 1.2s delay so user can read message
        }

        // Auto play speech response strictly in selected queryLang if enabled
        if (isSpeechEnabled) {
          playAudioResponse(null, data.response, queryLang, botMsg.id);
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

  // Voice recording & STT integration using dual engine: MediaRecorder + Web Speech API fallback
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

    // Stop MediaRecorder and process recorded audio chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        // Release microphone access
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        // If WebSpeech already captured the transcript successfully, send it
        if (capturedTranscriptRef.current && capturedTranscriptRef.current.trim()) {
          const finalSpeech = capturedTranscriptRef.current.trim();
          capturedTranscriptRef.current = null;
          setInput(finalSpeech);
          sendMessageDirect(finalSpeech);
          return;
        }

        // Otherwise transcribe audio chunks using Gemini backend (guaranteed to work in Brave, Firefox, etc.)
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm'
        });

        if (audioBlob.size > 2000) {
          setIsTranscribing(true);
          try {
            const base64Audio = await blobToBase64(audioBlob);
            const res = await api.post('/assistant/transcribe', {
              audioData: base64Audio,
              mimeType: 'audio/webm',
              language: lang
            });

            if (res.data?.success && res.data?.transcript && res.data?.transcript.trim()) {
              const transcribedText = res.data.transcript.trim();
              setInput(transcribedText);
              sendMessageDirect(transcribedText);
            } else {
              console.log('[VoiceSTT] No clear speech recognized in audio recording.');
            }
          } catch (transcribeErr) {
            console.error('[VoiceSTT] Audio transcription error:', transcribeErr);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (_e) {
        // ignore
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (capturedTranscriptRef.current && capturedTranscriptRef.current.trim()) {
        const finalSpeech = capturedTranscriptRef.current.trim();
        capturedTranscriptRef.current = null;
        setInput(finalSpeech);
        sendMessageDirect(finalSpeech);
      }
    }
  }, [blobToBase64, lang, sendMessageDirect]);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;

    capturedTranscriptRef.current = null;
    audioChunksRef.current = [];

    // Request microphone access
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      alert(lang === 'kn'
        ? 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಮೈಕ್ ಅನ್ನು ಅನುಮತಿಸಿ.'
        : 'Microphone permission denied. Please allow microphone access in your browser settings.');
      return;
    }

    // Initialize MediaRecorder for universal browser support (Brave, Chrome, Firefox, Safari)
    try {
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
    } catch (recorderErr) {
      console.warn('MediaRecorder init error:', recorderErr);
    }

    setIsRecording(true);
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 25) { // Auto-stop after 25s
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    // Parallel optimistic Web Speech API (instant in standard Chrome/Edge)
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';

        rec.onresult = (event) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }
          const cleaned = accumulated.trim();
          if (cleaned) {
            capturedTranscriptRef.current = cleaned;
            setInput(cleaned); // Show user what is being recognized live!
          }
        };

        rec.onerror = (e) => {
          // If network error (Brave), MediaRecorder continues capturing audio seamlessly
          console.warn('[VoiceSTT] Web Speech notice (using audio recorder fallback):', e.error);
        };

        rec.onend = () => {
          // Keep recording until user clicks Stop or timer expires
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn('SpeechRec start notice:', err);
      }
    }
  }, [lang, stopRecording]);

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
    isTranscribing,
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

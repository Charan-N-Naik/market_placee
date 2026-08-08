import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useAgriAdvisoryChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hello! I am KisanMitra, your real-time agri-advisory assistant. Ask me about live market prices, ICAR approved pesticide dosages, or government schemes.",
      detectedLang: 'en',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en'); // 'en' | 'hi' | 'kn' | 'tcy'
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAudioId, setActiveAudioId] = useState(null);
  
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('agri_chat_response', (data) => {
      setIsLoading(false);
      if (data && data.success) {
        const botMsg = {
          id: `msg-bot-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          entities: data.entities,
          structuredData: data.structuredData,
          audioOutput: data.audioOutput,
          detectedLang: data.detectedLang,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Auto play TTS audio if available
        if (data.audioOutput) {
          playAudioResponse(data.audioOutput, data.response, data.detectedLang, botMsg.id);
        }
      } else {
        const errorMsg = {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: data?.error || 'Unable to connect to advisory service. Please try again.',
          isError: true,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Send Text Query via WebSocket with REST fallback
  const sendMessage = async (textToSend = input) => {
    const trimmed = (textToSend || '').trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('agri_chat_query', {
        message: trimmed,
        lang,
        sessionId: 'user-session',
        generateAudio: true,
      });
    } else {
      // REST API Fallback
      try {
        const res = await fetch(`${API_BASE}/agri-chat/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, lang, generateAudio: true }),
        });
        const data = await res.json();
        setIsLoading(false);
        if (data.success) {
          const botMsg = {
            id: `msg-bot-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            intent: data.intent,
            entities: data.entities,
            structuredData: data.structuredData,
            audioOutput: data.audioOutput,
            detectedLang: data.detectedLang,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botMsg]);
          if (data.audioOutput) {
            playAudioResponse(data.audioOutput, data.response, data.detectedLang, botMsg.id);
          }
        }
      } catch (err) {
        setIsLoading(false);
        console.error('REST AgriChat error:', err);
      }
    }
  };

  // Start Voice Microphone Recording (STT)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          sendVoiceQuery(base64Audio);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Send Voice Payload (STT -> Intent -> Facts -> TTS)
  const sendVoiceQuery = async (base64Audio) => {
    setIsLoading(true);
    const userVoiceMsg = {
      id: `msg-user-voice-${Date.now()}`,
      role: 'user',
      content: '🎙️ Spoken Voice Query',
      isVoice: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userVoiceMsg]);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('agri_chat_query', {
        voiceAudio: base64Audio,
        lang,
        sessionId: 'user-session',
        generateAudio: true,
      });
    } else {
      try {
        const res = await fetch(`${API_BASE}/agri-chat/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceAudio: base64Audio, lang }),
        });
        const data = await res.json();
        setIsLoading(false);
        if (data.success) {
          const botMsg = {
            id: `msg-bot-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            intent: data.intent,
            entities: data.entities,
            structuredData: data.structuredData,
            audioOutput: data.audioOutput,
            detectedLang: data.detectedLang,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botMsg]);
          if (data.audioOutput) {
            playAudioResponse(data.audioOutput, data.response, data.detectedLang, botMsg.id);
          }
        }
      } catch (err) {
        setIsLoading(false);
        console.error('REST voice error:', err);
      }
    }
  };

  // TTS Audio Output Player
  const playAudioResponse = (audioOutput, textToSpeak, languageCode, msgId) => {
    setActiveAudioId(msgId);

    if (audioOutput && audioOutput.audioUrl) {
      const audio = new Audio(audioOutput.audioUrl);
      audio.onended = () => setActiveAudioId(null);
      audio.play().catch((e) => console.warn('Audio play error:', e));
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Browser Speech Synthesis Fallback
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const langLocales = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN', tcy: 'kn-IN' };
      utterance.lang = langLocales[languageCode] || 'en-IN';
      utterance.onend = () => setActiveAudioId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudioPlayback = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveAudioId(null);
  };

  return {
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
  };
}

export default useAgriAdvisoryChat;

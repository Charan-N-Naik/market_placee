import agriChatOrchestrator from '../services/agriChat/agriChatOrchestrator.js';
import marketPriceService from '../services/agriChat/marketPriceService.js';
import pesticideRecommendationService from '../services/agriChat/pesticideRecommendationService.js';
import govSchemeService from '../services/agriChat/govSchemeService.js';
import axios from 'axios';

/**
 * @desc Process KisanMitra text query via REST
 * @route POST /api/agri-chat/query
 */
export async function processTextQuery(req, res, next) {
  try {
    const message = req.body.message || req.body.text || '';
    const rawLang = req.body.lang || req.body.targetLang || req.body.language || 'en';
    const targetLang = typeof rawLang === 'string' && rawLang.startsWith('kn') ? 'kn' : rawLang;
    const sessionId = req.body.sessionId || req.ip || 'rest-session';
    const generateAudio = req.body.generateAudio !== false;

    const result = await agriChatOrchestrator.processQuery({
      message,
      targetLang,
      sessionId,
      generateAudio,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * @desc Process KisanMitra voice query via REST
 * @route POST /api/agri-chat/voice
 */
export async function processVoiceQuery(req, res, next) {
  try {
    const { voiceAudio, lang, sessionId } = req.body;
    if (!voiceAudio) {
      return res.status(400).json({ success: false, error: 'voiceAudio payload is required' });
    }
    const result = await agriChatOrchestrator.processQuery({
      message: '',
      voiceAudio,
      targetLang: lang,
      sessionId: sessionId || req.ip || 'voice-session',
      generateAudio: true,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * @desc Direct endpoint for Mandi Market Prices
 * @route GET /api/agri-chat/prices
 */
export async function getMarketPrices(req, res, next) {
  try {
    const { crop, state, district, market } = req.query;
    const prices = await marketPriceService.getMarketPrices({ crop, state, district, market });
    return res.status(200).json({ success: true, count: prices.length, prices });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc Direct endpoint for ICAR Pesticide Recommendation
 * @route GET /api/agri-chat/pesticides
 */
export async function getPesticideAdvisories(req, res, next) {
  try {
    const { crop, pestOrDisease, state } = req.query;
    const recommendation = await pesticideRecommendationService.getRecommendation({ crop, pestOrDisease, state });
    return res.status(200).json({ success: true, recommendation });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc Direct endpoint for Government Schemes
 * @route GET /api/agri-chat/schemes
 */
export async function getGovSchemes(req, res, next) {
  try {
    const { state, cropType, category, farmerCategory } = req.query;
    const schemes = await govSchemeService.getSchemes({ state, cropType, category, farmerCategory });
    return res.status(200).json({ success: true, count: schemes.length, schemes });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc Stream natural TTS audio (especially for Kannada / Indian languages)
 * @route GET /api/agri-chat/tts
 */
export async function streamTTSAudio(req, res, next) {
  try {
    const rawText = String(req.query.text || '').trim();
    const rawLang = String(req.query.lang || 'kn').trim().toLowerCase();
    const lang = rawLang.startsWith('kn') ? 'kn' : rawLang.startsWith('hi') ? 'hi' : 'en';

    if (!rawText) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    // Clean text: strip markdown symbols, URLs, and condense whitespace
    const cleanText = rawText
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Chunk text into sentence segments under 120 characters so Google TTS never exceeds query limits
    const sentences = cleanText.split(/(?<=[.!?|।\n])/);
    const chunks = [];
    let current = '';

    for (const s of sentences) {
      if ((current + ' ' + s).trim().length <= 120) {
        current = (current + ' ' + s).trim();
      } else {
        if (current) chunks.push(current);
        if (s.length > 120) {
          const words = s.split(' ');
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).trim().length <= 120) {
              wordChunk = (wordChunk + ' ' + w).trim();
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = w;
            }
          }
          current = wordChunk || '';
        } else {
          current = s;
        }
      }
    }
    if (current) chunks.push(current);

    // Limit to safe chunk length for speech duration
    const selectedChunks = chunks.slice(0, 6);

    const audioBuffers = [];
    for (const chunk of selectedChunks) {
      if (!chunk.trim()) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(chunk.trim())}`;
      const response = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 6000
      });
      if (response.data) {
        audioBuffers.push(Buffer.from(response.data));
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(500).json({ error: 'Failed to synthesize audio chunks' });
    }

    const combinedAudio = Buffer.concat(audioBuffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combinedAudio.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(combinedAudio);
  } catch (err) {
    console.error('[TTS] Audio streaming error:', err.message);
    return res.status(502).json({ error: 'TTS audio streaming failed' });
  }
}

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

    // Clean text: strip markdown symbols, markdown URLs, emojis, and condense whitespace
    const cleanText = rawText
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280); // Safe length for single TTS phrase chunk

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

    const response = await axios.get(ttsUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return response.data.pipe(res);
  } catch (err) {
    console.error('[TTS] Audio streaming error:', err.message);
    return res.status(502).json({ error: 'TTS audio streaming failed' });
  }
}

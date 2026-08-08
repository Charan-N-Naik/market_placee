import agriChatOrchestrator from '../services/agriChat/agriChatOrchestrator.js';
import marketPriceService from '../services/agriChat/marketPriceService.js';
import pesticideRecommendationService from '../services/agriChat/pesticideRecommendationService.js';
import govSchemeService from '../services/agriChat/govSchemeService.js';

/**
 * @desc Process KisanMitra text query via REST
 * @route POST /api/agri-chat/query
 */
export async function processTextQuery(req, res, next) {
  try {
    const { message, lang, sessionId, generateAudio } = req.body;
    const result = await agriChatOrchestrator.processQuery({
      message,
      targetLang: lang,
      sessionId: sessionId || req.ip || 'rest-session',
      generateAudio: generateAudio !== false,
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

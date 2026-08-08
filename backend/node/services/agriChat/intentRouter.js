/**
 * Intent Router & Entity Extractor for KisanMitra.
 * Classifies queries into: 'market_price', 'pesticide_advice', 'gov_scheme', 'general_query', 'fallback'.
 * Extracts entities: crop, state, district, market, pestName, category, farmerCategory.
 * Remembers session context for follow-up questions ("what about pesticide for the same crop?").
 */

export class IntentRouter {
  constructor() {
    this.sessionContext = new Map(); // sessionId -> { lastCrop, lastState, lastDistrict, lastIntent }
  }

  /**
   * Parse user query text and return classification and entities.
   * @param {string} text
   * @param {string} sessionId
   * @returns {Object} { intent, entities, context }
   */
  classify(text = '', sessionId = 'default') {
    const rawText = (text || '').trim();
    const lower = rawText.toLowerCase();

    // Fetch existing session context
    const previousContext = this.sessionContext.get(sessionId) || {};

    // Entity extraction patterns
    const entities = {
      crop: this.extractCrop(rawText) || previousContext.lastCrop || null,
      state: this.extractState(rawText) || previousContext.lastState || 'Karnataka',
      district: this.extractDistrict(rawText) || previousContext.lastDistrict || null,
      market: this.extractMarket(rawText) || null,
      pestOrDisease: this.extractPestOrDisease(rawText) || null,
      category: this.extractSchemeCategory(rawText) || null,
      farmerCategory: this.extractFarmerCategory(rawText) || 'all',
    };

    let intent = 'general_query';

    // 1. Market price intent detection
    if (
      lower.includes('price') || lower.includes('rate') || lower.includes('cost') ||
      lower.includes('mandi') || lower.includes('apmc') || lower.includes('bhaav') ||
      lower.includes('daam') || lower.includes('ಬೆಲೆ') || lower.includes('ದರ') || lower.includes('ಮಾರುಕಟ್ಟೆ')
    ) {
      intent = 'market_price';
    }
    // 2. Pesticide / Crop protection intent detection
    else if (
      lower.includes('pesticide') || lower.includes('pest') || lower.includes('disease') ||
      lower.includes('insect') || lower.includes('fungus') || lower.includes('blight') ||
      lower.includes('medicine') || lower.includes('spray') || lower.includes('dosage') ||
      lower.includes('ಕೀಟ') || lower.includes('ರೋಗ') || lower.includes('ಔಷಧ') || lower.includes('ಕಿಟನಾಶಕ')
    ) {
      intent = 'pesticide_advice';
    }
    // 3. Government scheme intent detection
    else if (
      lower.includes('scheme') || lower.includes('subsidy') || lower.includes('pm-kisan') ||
      lower.includes('pmkisan') || lower.includes('pmfby') || lower.includes('yojana') ||
      lower.includes('kcc') || lower.includes('loan') || lower.includes('insurance') ||
      lower.includes('ಯೋಜನೆ') || lower.includes('ಸಬ್ಸಿಡಿ') || lower.includes('ಸಾಲ')
    ) {
      intent = 'gov_scheme';
    }

    // Update session context
    const updatedContext = {
      lastCrop: entities.crop || previousContext.lastCrop,
      lastState: entities.state || previousContext.lastState,
      lastDistrict: entities.district || previousContext.lastDistrict,
      lastIntent: intent,
      updatedAt: Date.now(),
    };
    this.sessionContext.set(sessionId, updatedContext);

    return {
      intent,
      entities,
      context: updatedContext,
    };
  }

  extractCrop(text) {
    const crops = [
      'Tomato', 'Potato', 'Onion', 'Rice', 'Paddy', 'Wheat', 'Cotton', 'Maize', 'Corn',
      'Chilli', 'Garlic', 'Ginger', 'Mango', 'Banana', 'Sugarcane', 'Groundnut', 'Soyabean',
      'ಟೊಮೆಟೊ', 'ಈರುಳ್ಳಿ', 'ಅನ್ನ', 'ಭತ್ತ', 'ಗೋಧಿ', 'ಹತ್ತಿ', 'ಮೆಕ್ಕೆಜೋಳ', 'ಆಲೂಗಡ್ಡೆ'
    ];
    for (const c of crops) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
        // Normalize Kannada crop names to standard English names for DB lookup
        if (c === 'ಟೊಮೆಟೊ') return 'Tomato';
        if (c === 'ಈರುಳ್ಳಿ') return 'Onion';
        if (c === 'ಭತ್ತ' || c === 'ಅನ್ನ') return 'Rice';
        if (c === 'ಗೋಧಿ') return 'Wheat';
        if (c === 'ಹತ್ತಿ') return 'Cotton';
        if (c === 'ಮೆಕ್ಕೆಜೋಳ') return 'Maize';
        if (c === 'ಆಲೂಗಡ್ಡೆ') return 'Potato';
        return c;
      }
    }
    return null;
  }

  extractState(text) {
    const states = ['Karnataka', 'Maharashtra', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Punjab', 'Madhya Pradesh', 'West Bengal', 'ಕರ್ನಾಟಕ'];
    for (const s of states) {
      if (new RegExp(s, 'i').test(text)) {
        return s === 'ಕರ್ನಾಟಕ' ? 'Karnataka' : s;
      }
    }
    return null;
  }

  extractDistrict(text) {
    const districts = ['Kolar', 'Bangalore', 'Nashik', 'Raichur', 'Davangere', 'Hubli', 'Mandya', 'Mysore', 'Belgaum', 'Shimoga', 'ಕೋಲಾರ', 'ಬೆಂಗಳೂರು'];
    for (const d of districts) {
      if (new RegExp(d, 'i').test(text)) {
        if (d === 'ಕೋಲಾರ') return 'Kolar';
        if (d === 'ಬೆಂಗಳೂರು') return 'Bangalore';
        return d;
      }
    }
    return null;
  }

  extractMarket(text) {
    if (/apmc/i.test(text) || /yard/i.test(text) || /mandi/i.test(text)) {
      const match = text.match(/([A-Z][a-z]+)\s+(APMC|Mandi|Yard)/i);
      if (match) return match[0];
    }
    return null;
  }

  extractPestOrDisease(text) {
    const pests = ['Early Blight', 'Late Blight', 'Fruit Borer', 'Blast', 'Brown Planthopper', 'Thrips', 'Pink Bollworm', 'Wilt', 'Leaf Spot', 'Powdery Mildew'];
    for (const p of pests) {
      if (new RegExp(p, 'i').test(text)) return p;
    }
    if (/blight/i.test(text)) return 'Blight';
    if (/borer/i.test(text)) return 'Fruit Borer';
    if (/spot/i.test(text)) return 'Leaf Spot';
    if (/rot/i.test(text)) return 'Root Rot';
    return null;
  }

  extractSchemeCategory(text) {
    if (/insurance/i.test(text) || /bima/i.test(text)) return 'insurance';
    if (/credit/i.test(text) || /loan/i.test(text) || /kcc/i.test(text)) return 'credit';
    if (/subsidy/i.test(text) || /discount/i.test(text)) return 'subsidy';
    if (/irrigation/i.test(text) || /drip/i.test(text) || /water/i.test(text)) return 'irrigation';
    if (/machinery/i.test(text) || /tiller/i.test(text) || /tractor/i.test(text)) return 'machinery';
    return null;
  }

  extractFarmerCategory(text) {
    if (/small/i.test(text) || /marginal/i.test(text)) return 'small';
    return 'all';
  }
}

export const intentRouter = new IntentRouter();
export default intentRouter;

/**
 * Interfaces and contract definitions for KisanMitra Agri-Advisory Chatbot modules.
 * This pluggable architecture allows swapping data sources, ML models, translation, 
 * and speech engines without mutating core business or orchestration logic.
 */

/**
 * Interface: IMarketPriceProvider
 * Contract for fetching live/near-live mandi market prices.
 */
export class IMarketPriceProvider {
  /**
   * Fetch market prices filtered by crop, state, district, or market name.
   * @param {Object} query - { crop, state, district, market }
   * @returns {Promise<Array<Object>>} List of price objects { crop, variety, state, district, market, minPrice, maxPrice, modalPrice, unit, updatedAt, provider }
   */
  async getMarketPrices(query) {
    throw new Error('IMarketPriceProvider.getMarketPrices() must be implemented.');
  }
}

/**
 * Interface: IPesticideAdvisor
 * Contract for recommending crop protection, pesticides, and dosages.
 */
export class IPesticideAdvisor {
  /**
   * Get recommended pesticide advisories for crop and pest/disease.
   * @param {Object} query - { crop, pestOrDisease, state }
   * @returns {Promise<Object>} { crop, pestOrDisease, pesticide, activeIngredient, dosage, applicationMethod, safetyPrecaution, waitingPeriodDays, sourceAuthority, disclaimer }
   */
  async getRecommendation(query) {
    throw new Error('IPesticideAdvisor.getRecommendation() must be implemented.');
  }
}

/**
 * Interface: IGovSchemeProvider
 * Contract for querying agricultural government schemes.
 */
export class IGovSchemeProvider {
  /**
   * Get government schemes matching farmer filter criteria.
   * @param {Object} query - { state, cropType, category, farmerCategory }
   * @returns {Promise<Array<Object>>} List of matching schemes
   */
  async getSchemes(query) {
    throw new Error('IGovSchemeProvider.getSchemes() must be implemented.');
  }
}

/**
 * Interface: ILanguageProvider
 * Contract for language detection and translation.
 */
export class ILanguageProvider {
  /**
   * Detect language of input text.
   * @param {string} text
   * @returns {Promise<string>} Language code ('en', 'hi', 'kn', 'tcy')
   */
  async detectLanguage(text) {
    throw new Error('ILanguageProvider.detectLanguage() must be implemented.');
  }

  /**
   * Translate text between source and target languages.
   * @param {string} text
   * @param {string} sourceLang
   * @param {string} targetLang
   * @returns {Promise<string>} Translated text
   */
  async translate(text, sourceLang, targetLang) {
    throw new Error('ILanguageProvider.translate() must be implemented.');
  }
}

/**
 * Interface: ISpeechToTextProvider
 * Contract for Automatic Speech Recognition (ASR).
 */
export class ISpeechToTextProvider {
  /**
   * Transcribe raw audio buffer into text.
   * @param {Buffer} audioBuffer
   * @param {string} languageCode - ('en-IN', 'hi-IN', 'kn-IN', 'tcy-IN')
   * @returns {Promise<Object>} { text, confidence, languageCode }
   */
  async transcribe(audioBuffer, languageCode) {
    throw new Error('ISpeechToTextProvider.transcribe() must be implemented.');
  }
}

/**
 * Interface: ITextToSpeechProvider
 * Contract for Text-To-Speech synthesis (TTS).
 */
export class ITextToSpeechProvider {
  /**
   * Synthesize text into audio buffer / audio URL.
   * @param {string} text
   * @param {string} languageCode - ('en-IN', 'hi-IN', 'kn-IN')
   * @returns {Promise<Object>} { audioBase64, mimeType, audioUrl }
   */
  async synthesize(text, languageCode) {
    throw new Error('ITextToSpeechProvider.synthesize() must be implemented.');
  }
}

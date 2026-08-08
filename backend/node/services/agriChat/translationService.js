import axios from 'axios';
import { ILanguageProvider } from './interfaces.js';
import { tuluTemplates } from './tuluTemplates.js';
import registry from './serviceRegistry.js';

class TranslationService extends ILanguageProvider {
  constructor() {
    super();
    this.provider = process.env.TRANSLATION_PROVIDER || 'bhashini'; // 'bhashini' | 'google' | 'local'
  }

  /**
   * Detect language of query string.
   * @param {string} text
   * @returns {Promise<string>} 'en' | 'hi' | 'kn' | 'tcy'
   */
  async detectLanguage(text = '') {
    if (!text || typeof text !== 'string') return 'en';

    const str = text.trim();

    // Check for Kannada script range \u0C80-\u0CFF
    const kanScriptMatches = (str.match(/[\u0C80-\u0CFF]/g) || []).length;
    // Check for Devanagari (Hindi) script range \u0900-\u097F
    const devScriptMatches = (str.match(/[\u0900-\u097F]/g) || []).length;

    if (kanScriptMatches > 2) {
      // Check if specifically contains Tulu keywords
      if (str.includes('ಯಾನ್') || str.includes('ಇತ್ತೆ') || str.includes('ಉಂಡು') || str.includes('ಬೋಡು') || str.includes('ಆಂಡ್')) {
        return 'tcy';
      }
      return 'kn';
    }

    if (devScriptMatches > 2) {
      return 'hi';
    }

    // Heuristic for Latin-transliterated Hindi/Kannada/Tulu or English
    const lower = str.toLowerCase();
    if (lower.includes('bhaav') || lower.includes('daam') || lower.includes('keet') || lower.includes('yojana')) {
      return 'hi';
    }
    if (lower.includes('bele') || lower.includes('roga') || lower.includes('yojane')) {
      return 'kn';
    }
    if (lower.includes('podu') || lower.includes('yane') || lower.includes('pattod')) {
      return 'tcy';
    }

    return 'en';
  }

  /**
   * Translate text using Bhashini API primary, Google fallback, or local dictionary.
   * @param {string} text
   * @param {string} sourceLang - 'en', 'hi', 'kn', 'tcy'
   * @param {string} targetLang - 'en', 'hi', 'kn', 'tcy'
   */
  async translate(text = '', sourceLang = 'en', targetLang = 'en') {
    if (!text || sourceLang === targetLang) return text;

    // Handle Tulu special routing using curated templates / Kannada transliteration
    if (targetLang === 'tcy') {
      return this.translateToTulu(text, sourceLang);
    }

    // Try Bhashini ULCA API if API keys configured
    if (this.provider === 'bhashini' && process.env.BHASHINI_API_KEY && process.env.BHASHINI_USER_ID) {
      try {
        const bhashiniRes = await axios.post('https://dhruva-api.bhashini.gov.in/services/inference/translation', {
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: {
                  sourceLanguage: sourceLang,
                  targetLanguage: targetLang
                }
              }
            }
          ],
          inputData: {
            input: [{ source: text }]
          }
        }, {
          headers: {
            'Authorization': process.env.BHASHINI_API_KEY,
            'userID': process.env.BHASHINI_USER_ID,
            'Content-Type': 'application/json'
          },
          timeout: 4000
        });

        const translatedText = bhashiniRes.data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translatedText) return translatedText;
      } catch (bhashiniErr) {
        console.warn('[TranslationService] Bhashini API call failed, falling back:', bhashiniErr.message);
      }
    }

    // Try Google Translate API or free translation endpoint fallback
    try {
      const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`, { timeout: 3000 });
      if (res.data && res.data[0] && res.data[0][0] && res.data[0][0][0]) {
        return res.data[0].map(item => item[0]).filter(Boolean).join(' ');
      }
    } catch (gErr) {
      console.warn('[TranslationService] Google translate fallback failed, returning original:', gErr.message);
    }

    return text;
  }

  /**
   * Tulu translation strategy handler.
   */
  translateToTulu(text, sourceLang) {
    // Flag Tulu explicit disclaimer note
    return `${text}\n\n${tuluTemplates.disclaimerNote}`;
  }
}

export const translationService = new TranslationService();
registry.register('language', translationService);
export default translationService;

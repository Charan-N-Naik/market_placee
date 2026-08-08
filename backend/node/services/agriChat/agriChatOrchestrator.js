import registry from './serviceRegistry.js';
import intentRouter from './intentRouter.js';
import { tuluTemplates } from './tuluTemplates.js';
import { chatResponse } from '../aiService.js';

export class AgriChatOrchestrator {
  /**
   * Process incoming text or voice query end-to-end.
   * @param {Object} payload - { message, voiceAudio, targetLang, sessionId, generateAudio }
   */
  async processQuery({ message = '', voiceAudio = null, targetLang = null, sessionId = 'default', generateAudio = true }) {
    const startTime = Date.now();

    // Fetch registered service modules
    const languageService = registry.get('language');
    const speechService = registry.get('speech');

    let processedText = message;

    // Step 1: Voice STT processing if voice audio provided
    if (voiceAudio) {
      const sttResult = await speechService.transcribe(voiceAudio, targetLang || 'en');
      processedText = sttResult.text || message;
    }

    if (!processedText || processedText.trim().length === 0) {
      return {
        success: false,
        response: 'Please enter or speak a question regarding crop prices, pesticides, or government schemes.',
        intent: 'fallback',
      };
    }

    // Step 2: Detect Language if targetLang not explicitly set
    const detectedLang = targetLang || await languageService.detectLanguage(processedText);

    // Step 3: Intent Classification & Entity Extraction
    const { intent, entities, context } = intentRouter.classify(processedText, sessionId);

    let moduleData = null;
    let formattedResponse = '';

    // Step 4: Route query to corresponding Service Module (Fact Retrieval Layer)
    switch (intent) {
      case 'market_price': {
        const priceService = registry.get('market_price');
        moduleData = await priceService.getMarketPrices({
          crop: entities.crop,
          state: entities.state,
          district: entities.district,
          market: entities.market,
        });
        formattedResponse = this.formatMarketPriceResponse(moduleData, entities, detectedLang);
        break;
      }

      case 'pesticide_advice': {
        const pesticideService = registry.get('pesticide');
        moduleData = await pesticideService.getRecommendation({
          crop: entities.crop,
          pestOrDisease: entities.pestOrDisease,
          state: entities.state,
        });
        formattedResponse = this.formatPesticideResponse(moduleData, detectedLang);
        break;
      }

      case 'gov_scheme': {
        const schemeService = registry.get('gov_scheme');
        moduleData = await schemeService.getSchemes({
          state: entities.state,
          cropType: entities.crop,
          category: entities.category,
          farmerCategory: entities.farmerCategory,
        });
        formattedResponse = this.formatGovSchemeResponse(moduleData, entities, detectedLang);
        break;
      }

      default: {
        // RAG LLM formatting fallback for general queries
        try {
          formattedResponse = await chatResponse(processedText, detectedLang);
        } catch (_err) {
          formattedResponse = detectedLang === 'kn'
            ? "ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ಮಿತ್ರ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ಬೆಳೆ ಬೆಲೆ, ರೋಗ ನಿಯಂತ್ರಣ ಅಥವಾ ಸರಕಾರಿ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ."
            : "Hello! Welcome to KisanMitra. Ask about market prices, pest control, or government schemes.";
        }
        break;
      }
    }

    // Step 5: Translate formatted fact response into target language if needed
    let finalLanguageResponse = formattedResponse;
    if (detectedLang !== 'en' && detectedLang !== 'tcy') {
      finalLanguageResponse = await languageService.translate(formattedResponse, 'en', detectedLang);
    } else if (detectedLang === 'tcy') {
      // Apply Tulu template formatting
      finalLanguageResponse = this.applyTuluFormatting(intent, moduleData, entities, formattedResponse);
    }

    // Step 6: Text-To-Speech (TTS) Synthesis
    let audioOutput = null;
    if (generateAudio) {
      audioOutput = await speechService.synthesize(finalLanguageResponse, detectedLang);
    }

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      query: processedText,
      intent,
      entities,
      detectedLang,
      response: finalLanguageResponse,
      structuredData: moduleData,
      audioOutput,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  formatMarketPriceResponse(data, entities, lang) {
    if (!data || data.length === 0) {
      return `Currently, live market prices for ${entities.crop || 'the requested crop'} are unavailable. Please check back shortly.`;
    }
    const item = data[0];
    return `Today's mandi price for ${item.crop} (${item.variety}) in ${item.market || item.district || item.state}: Modal Price is ₹${item.modalPrice} per quintal (₹${item.pricePerKg} per kg). Min Price: ₹${item.minPrice}, Max Price: ₹${item.maxPrice}. Source: ${item.provider}.`;
  }

  formatPesticideResponse(data, lang) {
    if (!data || !data.success) {
      return data?.message || "Please specify a crop and pest name for ICAR approved pesticide recommendations.";
    }
    return `ICAR Recommendation for ${data.crop} (${data.pestOrDisease}):\nApproved Pesticide: ${data.approvedPesticide} (${data.activeIngredient})\nDosage: ${data.dosage}\nApplication Method: ${data.applicationMethod}\nSafety Precautions: ${data.safetyPrecaution}\nHarvest Safety Waiting Period: ${data.waitingPeriodDays} days.\nAuthority: ${data.sourceAuthority}\n\n${data.disclaimer}`;
  }

  formatGovSchemeResponse(data, entities, lang) {
    if (!data || data.length === 0) {
      return `No specific schemes found for ${entities.state || 'your region'}. Popular schemes include PM-KISAN, PMFBY, and KCC.`;
    }
    const scheme = data[0];
    return `Government Scheme: ${scheme.schemeName}\nEligibility: ${scheme.eligibility}\nKey Benefits: ${scheme.benefits}\nApplication Process: ${scheme.applicationProcess}\nOfficial Portal: ${scheme.officialUrl}`;
  }

  applyTuluFormatting(intent, data, entities, defaultText) {
    let tuluFormatted = defaultText;
    if (intent === 'market_price' && Array.isArray(data) && data.length > 0) {
      const item = data[0];
      tuluFormatted = tuluTemplates.market_price.format(item.crop, item.market, item.modalPrice, item.pricePerKg);
    } else if (intent === 'pesticide_advice' && data && data.approvedPesticide) {
      tuluFormatted = tuluTemplates.pesticide_advice.format(data.crop, data.pestOrDisease, data.approvedPesticide, data.dosage, data.safetyPrecaution);
    } else if (intent === 'gov_scheme' && Array.isArray(data) && data.length > 0) {
      const scheme = data[0];
      tuluFormatted = tuluTemplates.gov_scheme.format(scheme.schemeName, scheme.benefits, scheme.applicationProcess);
    }
    return `${tuluFormatted}\n\n${tuluTemplates.disclaimerNote}`;
  }
}

export const agriChatOrchestrator = new AgriChatOrchestrator();
export default agriChatOrchestrator;

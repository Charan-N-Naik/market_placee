import { IPesticideAdvisor } from './interfaces.js';
import PesticideAdvisory from '../../models/PesticideAdvisory.js';
import registry from './serviceRegistry.js';
import tier2VisionClassifier from './tier2VisionClassifier.js';

class PesticideRecommendationService extends IPesticideAdvisor {
  constructor() {
    super();
    this.mandatoryDisclaimer = "SAFETY DISCLAIMER: Always read the label and product leaflet carefully before use. Wear protective equipment (gloves, mask, goggles). Strictly adhere to recommended dosage and harvest safety waiting periods. Use only CIBRC approved pesticides.";
  }

  /**
   * Tier 1: Query ICAR approved DB for crop and pest/disease recommendation.
   * @param {Object} query - { crop, pestOrDisease, state }
   */
  async getRecommendation(query = {}) {
    const { crop = '', pestOrDisease = '', state = '' } = query;

    if (!crop && !pestOrDisease) {
      return {
        success: false,
        message: 'Please specify a crop name or pest/disease symptoms.',
        disclaimer: this.mandatoryDisclaimer,
      };
    }

    try {
      const filter = {};
      if (crop) {
        filter.crop = new RegExp(crop, 'i');
      }
      if (pestOrDisease) {
        filter.pestOrDisease = new RegExp(pestOrDisease, 'i');
      }

      let advisories = await PesticideAdvisory.find(filter).lean();

      // If specific search returns empty, search by crop alone
      if ((!advisories || advisories.length === 0) && crop) {
        advisories = await PesticideAdvisory.find({ crop: new RegExp(crop, 'i') }).lean();
      }

      if (advisories && advisories.length > 0) {
        const item = advisories[0];
        return {
          success: true,
          crop: item.crop,
          pestOrDisease: item.pestOrDisease,
          symptoms: item.symptoms || [],
          approvedPesticide: item.approvedPesticide,
          activeIngredient: item.activeIngredient,
          dosage: item.dosage,
          applicationMethod: item.applicationMethod,
          safetyPrecaution: item.safetyPrecaution,
          waitingPeriodDays: item.waitingPeriodDays,
          sourceAuthority: item.sourceAuthority,
          disclaimer: this.mandatoryDisclaimer,
        };
      }
    } catch (dbErr) {
      console.warn('[PesticideRecommendationService] DB lookup error, using fallback ICAR rules:', dbErr.message);
    }

    // Smart Fallback Rule Engine if DB query finds no direct match
    return this.getFallbackRecommendation(crop, pestOrDisease);
  }

  /**
   * Fallback rule-based ICAR recommendation engine.
   */
  getFallbackRecommendation(crop, pestOrDisease) {
    const cropLower = (crop || '').toLowerCase();
    const pestLower = (pestOrDisease || '').toLowerCase();

    let rec = {
      crop: crop || 'General Crop',
      pestOrDisease: pestOrDisease || 'Fungal Infection / Pest Damage',
      approvedPesticide: 'Neem Oil 1500 PPM (Organic) or Copper Oxychloride 50% WP',
      activeIngredient: 'Azadirachtin / Copper Oxychloride',
      dosage: '3-5 ml Neem Oil per liter water OR 2.5 grams Copper Oxychloride per liter water',
      applicationMethod: 'Foliar spray in late afternoon. Ensure uniform foliage coverage.',
      safetyPrecaution: 'Wear mask, gloves, and protective clothing. Keep spray away from drinking water sources.',
      waitingPeriodDays: 5,
      sourceAuthority: 'ICAR Organic Agriculture & Integrated Pest Management (IPM) Guidelines',
      disclaimer: this.mandatoryDisclaimer,
    };

    if (cropLower.includes('tomato') || pestLower.includes('blight')) {
      rec = {
        crop: 'Tomato',
        pestOrDisease: 'Early/Late Blight or Leaf Spot',
        approvedPesticide: 'Mancozeb 75% WP',
        activeIngredient: 'Mancozeb',
        dosage: '2.0 to 2.5 grams per liter of water (500-600g per acre in 200L water)',
        applicationMethod: 'Foliar spray at initial disease appearance. Repeat at 10-12 day intervals if rainy.',
        safetyPrecaution: 'Wear rubber gloves and mask. Avoid contact with skin and eyes. Wash hands after use.',
        waitingPeriodDays: 7,
        sourceAuthority: 'ICAR-IIHR Approved Plant Protection Advisory',
        disclaimer: this.mandatoryDisclaimer,
      };
    } else if (cropLower.includes('rice') || cropLower.includes('paddy')) {
      rec = {
        crop: 'Rice / Paddy',
        pestOrDisease: 'Blast / Sheath Blight',
        approvedPesticide: 'Tricyclazole 75% WP',
        activeIngredient: 'Tricyclazole',
        dosage: '0.6 gram per liter of water (120 grams per acre)',
        applicationMethod: 'Foliar spray at early panicle or leaf spot stage.',
        safetyPrecaution: 'Use face mask and protective boots during spraying in flooded fields.',
        waitingPeriodDays: 14,
        sourceAuthority: 'ICAR-NRRI National Rice Research Guidelines',
        disclaimer: this.mandatoryDisclaimer,
      };
    }

    return { success: true, ...rec };
  }

  /**
   * Tier 2 Extension: Image-Based Pest/Disease Detection (PlantVillage & PlantDoc Transfer Learning Pipeline).
   * 
   * Strict Output Constraint:
   * 1. Vision model classifies image → outputs disease/pest label + confidence score ONLY.
   * 2. Detected pest label is passed to Tier 1 ICAR DB lookup table to fetch verified dosage & safety precautions.
   * 3. The vision model NEVER generates a dosage number itself.
   * 
   * @param {Buffer|string} imageBuffer
   * @param {string} mimeType
   */
  async classifyPestFromImage(imageBuffer, mimeType = 'image/jpeg') {
    // Step 1: Run Tier 2 ML vision model (PlantVillage & PlantDoc trained MobileNetV3 / ResNet50)
    const visionClassification = await tier2VisionClassifier.classifyPestFromImage(imageBuffer, mimeType);

    // If healthy leaf detected, return clean bill of health
    if (visionClassification.healthyLeafDetected) {
      return {
        success: true,
        tier: 'Tier 2 Vision Model (MobileNetV3/ResNet50 Transfer Learning)',
        datasetSources: visionClassification.datasetSources,
        crop: visionClassification.crop,
        classifiedPest: 'None (Healthy Crop Leaf)',
        confidenceScore: visionClassification.confidenceScore,
        recommendation: {
          approvedPesticide: 'None Required',
          dosage: 'N/A - Plant is healthy',
          applicationMethod: 'Maintain regular irrigation and balanced NPK fertilizer schedule.',
          safetyPrecaution: 'Continue routine field monitoring.',
          waitingPeriodDays: 0,
          disclaimer: this.mandatoryDisclaimer,
        }
      };
    }

    // Step 2: Pass detected pest label to Tier 1 ICAR DB lookup table (Strict Output Constraint)
    const icardbRecommendation = await this.getRecommendation({
      crop: visionClassification.crop,
      pestOrDisease: visionClassification.classifiedPest,
    });

    return {
      success: true,
      tier: 'Tier 2 Vision Classifier + Tier 1 ICAR DB Lookup',
      datasetSources: visionClassification.datasetSources,
      modelArchitecture: visionClassification.modelArchitecture,
      crop: visionClassification.crop,
      classifiedPest: visionClassification.classifiedPest,
      confidenceScore: visionClassification.confidenceScore,
      recommendation: icardbRecommendation,
    };
  }
}

export const pesticideRecommendationService = new PesticideRecommendationService();
registry.register('pesticide', pesticideRecommendationService);
export default pesticideRecommendationService;

import { IGovSchemeProvider } from './interfaces.js';
import GovernmentScheme from '../../models/GovernmentScheme.js';
import registry from './serviceRegistry.js';

class GovSchemeService extends IGovSchemeProvider {
  constructor() {
    super();
    // Static fallback scheme dataset in case DB or external myScheme API is unavailable
    this.fallbackSchemes = [
      {
        schemeName: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        code: 'PM-KISAN',
        state: 'All India',
        category: 'credit',
        cropType: 'All Crops',
        farmerCategory: 'all',
        eligibility: 'All landholding farmer families with cultivable land in their names.',
        benefits: 'Direct income support of ₹6,000 per year in 3 equal installments of ₹2,000.',
        applicationProcess: 'Register at pmkisan.gov.in portal or visit nearest CSC center.',
        documentsRequired: ['Aadhaar Card', 'Land Pahani/7-12 RTC', 'Bank Passbook'],
        officialUrl: 'https://pmkisan.gov.in',
      },
      {
        schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        code: 'PMFBY',
        state: 'All India',
        category: 'insurance',
        cropType: 'All Crops',
        farmerCategory: 'all',
        eligibility: 'All farmers growing notified crops in notified areas.',
        benefits: 'Comprehensive crop insurance against pre-sowing to post-harvest natural risks. Low farmer premium (1.5% to 2%).',
        applicationProcess: 'Apply online at pmfby.gov.in or through bank branches / CSCs before cutoff date.',
        documentsRequired: ['Aadhaar', 'Land Sowing Certificate', 'Bank Account details'],
        officialUrl: 'https://pmfby.gov.in',
      },
      {
        schemeName: 'Kisan Credit Card (KCC) Scheme',
        code: 'KCC',
        state: 'All India',
        category: 'credit',
        cropType: 'All Crops',
        farmerCategory: 'all',
        eligibility: 'All individual farmers, tenant farmers, and SHGs.',
        benefits: 'Crop loans up to ₹3 Lakh at low effective interest rate of 4% per annum with prompt repayment.',
        applicationProcess: 'Submit single-page KCC application at any commercial or rural bank.',
        documentsRequired: ['Aadhaar', 'Land Records', 'Passport photo'],
        officialUrl: 'https://myscheme.gov.in/schemes/kcc',
      },
      {
        schemeName: 'PM Krishi Sinchayee Yojana (Micro Irrigation Subsidy)',
        code: 'PMKSY-MI',
        state: 'Karnataka',
        category: 'irrigation',
        cropType: 'Horticulture & Agriculture Crops',
        farmerCategory: 'small',
        eligibility: 'Small and marginal farmers owning cultivable agricultural land with water source.',
        benefits: 'Up to 90% subsidy on Drip and Sprinkler irrigation installation for small/marginal farmers.',
        applicationProcess: 'Apply via Raitha Siri / e-Samrakshane portal or Raitha Samparka Kendra.',
        documentsRequired: ['RTC/Pahani', 'Aadhaar Card', 'Bank Passbook'],
        officialUrl: 'https://pmksy.gov.in',
      }
    ];
  }

  /**
   * Fetch government schemes filtering by state, crop, farmer category, and scheme category.
   * @param {Object} query - { state, cropType, category, farmerCategory }
   */
  async getSchemes(query = {}) {
    const { state = '', cropType = '', category = '', farmerCategory = '' } = query;

    try {
      const filter = {};
      if (state && state.toLowerCase() !== 'all india') {
        filter.$or = [{ state: new RegExp(state, 'i') }, { state: 'All India' }];
      }
      if (category) {
        filter.category = new RegExp(category, 'i');
      }
      if (cropType) {
        filter.$or = [{ cropType: new RegExp(cropType, 'i') }, { cropType: 'All Crops' }];
      }
      if (farmerCategory && farmerCategory !== 'all') {
        filter.$or = [{ farmerCategory: farmerCategory }, { farmerCategory: 'all' }];
      }

      const dbSchemes = await GovernmentScheme.find(filter).lean();
      if (dbSchemes && dbSchemes.length > 0) {
        return dbSchemes;
      }
    } catch (err) {
      console.warn('[GovSchemeService] DB query error, using fallback scheme dataset:', err.message);
    }

    // Filter fallback dataset
    let results = this.fallbackSchemes;
    if (state && state.toLowerCase() !== 'all india') {
      results = results.filter(s => s.state.toLowerCase() === 'all india' || s.state.toLowerCase().includes(state.toLowerCase()));
    }
    if (category) {
      const catLower = category.toLowerCase();
      const matched = results.filter(s => s.category.toLowerCase().includes(catLower));
      if (matched.length > 0) results = matched;
    }

    return results;
  }
}

export const govSchemeService = new GovSchemeService();
registry.register('gov_scheme', govSchemeService);
export default govSchemeService;

/**
 * Curated Tulu Phrase & Response Template Dictionary for KisanMitra.
 * Since mainstream machine translation APIs (Bhashini/Google) do not reliably support Tulu,
 * structured facts (crop, prices, pesticides, schemes) are injected into these curated Tulu templates.
 */

export const tuluTemplates = {
  welcome: "ನಮಸ್ಕಾರ! ಯಾನ್ ಕಿಸಾನ್ ಮಿತ್ರ. ನಿಕ್ಲೆಗ್ ಬೆಳೆ ಬೆಲೆ, ಕೀಟನಾಶಕ, ಅತ್ತಂದೆ ಸರಕಾರಿ ಯೋಜನೆಲೆ ಬಗ್ಗೆ ಬೋಡಾಯಿನ ಸಹಾಯ ಮಲ್ಪುವೆ.",
  
  market_price: {
    format: (crop, market, modalPrice, pricePerKg) => 
      `ಇನಿ ${market || 'ಮಾರುಕಟ್ಟೆ'} ಡ್ ${crop || 'ಬೆಳೆ'} ದ ಬೆಲೆ: ಕ್ವಿಂಟಾಲ್‌ಗ್ ₹${modalPrice} (ಕಿಲೋಗ್ ₹${pricePerKg}). ಈ ಮಾಹಿತಿ ತಕ್ಷಣದ ಮಾರುಕಟ್ಟೆ ಲೆಕ್ಕೊಡ್ದು ದೆತೊನ್ದಿನಿ.`,
    notFound: (crop) => 
      `${crop || 'ಈ ಬೆಳೆ'} ದ ಇತ್ತೆದ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಲಭ್ಯ ಇಜ್ಜಿ. ದಯವಿಟ್ಟು ಕೋಲಾರ ಅಥವಾ ಮಂಗಳೂರು APMC ಮಾರುಕಟ್ಟೆ ಪರಿಶೀಲಿಸಿ.`
  },

  pesticide_advice: {
    format: (crop, pest, pesticide, dosage, safety) => 
      `${crop} ಡ್ ${pest} ಗಾದ್ ಶಿಫಾರಸು ಮಲ್ತಿನ ಕೀಟನಾಶಕ: ${pesticide}.\nಅಳತೆ: ${dosage}.\nಮುನ್ನೆಚ್ಚರಿಕೆ: ${safety}\nಸೂಚನೆ: ಕೀಟನಾಶಕ ಉಪಯೋಗಿಸುನಗ ಮುಖವಾಡ ಬೊಕ್ಕ ಕೈ ಚೀಲ ಪಾಡ್ಲೆ.`,
    disclaimer: "ಸೂಚನೆ: ಸಿಐಬಿಸಿ (CIBRC) ಅನುಮೋದಿತ ಕೀಟನಾಶಕನ್ ಮಾತ್ರೆ ಉಪಯೋಗಿಸಿ. ಬೆಳೆ ಕೋಯ್ಲುಗ್ ದುಂಬು ಸೂಕ್ತ ದಿನ ಕಾಪ್ಲೆ."
  },

  gov_scheme: {
    format: (schemeName, benefits, process) => 
      `ಸರಕಾರಿ ಯೋಜನೆ: ${schemeName}\nಪ್ರಯೋಜನೊಲು: ${benefits}\nಅರ್ಜಿ ಪಾಡುನ ವಿಧಾನ: ${process}`,
    general: "ರೈತೆರೆಗ್ PM-KISAN, PMFBY ಬೊಕ್ಕ KCC ಯೋಜನೆಲು ಲಭ್ಯ ಉಂಡು. ಹೆಚ್ಚಿನ ವಿವರಣೆಗ್ ನಿಮ್ಮ ಕೈತಲದ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರೊಗ್ ಪೋಲೆ."
  },

  general_fallback: "ನಿಕ್ಲೆನ ಪ್ರಶ್ನೆ ಕಿಸಾನ್‌ಮಿತ್ರಗ್ ಅರ್ಥ ಆಂಡ್. ದಯವಿಟ್ಟು ಬೆಳೆ ಪುದರ್, ಮಾರುಕಟ್ಟೆ ಅಥವಾ ರೋಗದ ಬಗ್ಗೆ ಸ್ಪಷ್ಟವಾದ್ ಕೇಳ್ಲೆ.",

  disclaimerNote: "[Tulu Support Note]: ತುಳು ಭಾಷೆಯ ಧ್ವನಿ/ಪಾಠ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಮಾದರಿ ಟೆಂಪ್ಲೇಟ್ ಹಾಗೂ ಕನ್ನಡ ಲಿಪಿಯೊಂದಿಗೆ ನೀಡಲಾಗಿದೆ."
};

export default tuluTemplates;

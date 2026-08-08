import intentRouter from '../services/agriChat/intentRouter.js';
import marketPriceService from '../services/agriChat/marketPriceService.js';
import pesticideRecommendationService from '../services/agriChat/pesticideRecommendationService.js';
import govSchemeService from '../services/agriChat/govSchemeService.js';
import translationService from '../services/agriChat/translationService.js';
import speechService from '../services/agriChat/speechService.js';
import agriChatOrchestrator from '../services/agriChat/agriChatOrchestrator.js';

async function runTests() {
  console.log('====================================================');
  console.log('  KisanMitra Agri-Advisory Chatbot Test Suite       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: Intent Classification - Market Price
  const query1 = "What is the market price of tomato in Kolar today?";
  const res1 = intentRouter.classify(query1, 'test-session-1');
  assert(res1.intent === 'market_price', 'Intent Classification: Market Price');
  assert(res1.entities.crop === 'Tomato', 'Entity Extraction: Crop (Tomato)');
  assert(res1.entities.district === 'Kolar', 'Entity Extraction: District (Kolar)');

  // Test 2: Intent Classification - Pesticide Advisory
  const query2 = "How to control early blight in tomato using pesticide?";
  const res2 = intentRouter.classify(query2, 'test-session-1');
  assert(res2.intent === 'pesticide_advice', 'Intent Classification: Pesticide Advice');
  assert(res2.entities.pestOrDisease === 'Early Blight', 'Entity Extraction: Pest/Disease (Early Blight)');

  // Test 3: Intent Classification - Government Scheme
  const query3 = "What subsidies are available for small farmers in Karnataka under PM-KISAN?";
  const res3 = intentRouter.classify(query3, 'test-session-1');
  assert(res3.intent === 'gov_scheme', 'Intent Classification: Gov Scheme');
  assert(res3.entities.state === 'Karnataka', 'Entity Extraction: State (Karnataka)');

  // Test 4: Market Price Module & Fallback Resilience
  const prices = await marketPriceService.getMarketPrices({ crop: 'Tomato', district: 'Kolar' });
  assert(Array.isArray(prices) && prices.length > 0, 'Market Price Service: Returns price records array');
  assert(prices[0].modalPrice > 0, 'Market Price Service: Modal price is valid positive number');

  // Test 5: Pesticide Advisor & Safety Disclaimer Enforcement
  const pesticideRes = await pesticideRecommendationService.getRecommendation({ crop: 'Tomato', pestOrDisease: 'Early Blight' });
  assert(pesticideRes.success === true, 'Pesticide Advisory: Recommendation returned successfully');
  assert(typeof pesticideRes.dosage === 'string' && pesticideRes.dosage.length > 0, 'Pesticide Advisory: Dosage text present');
  assert(pesticideRes.disclaimer.includes('SAFETY DISCLAIMER'), 'Pesticide Advisory: Mandatory safety disclaimer included');

  // Test 6: Government Scheme Module
  const schemes = await govSchemeService.getSchemes({ state: 'Karnataka', category: 'credit' });
  assert(Array.isArray(schemes) && schemes.length > 0, 'Gov Scheme Service: Returns scheme records array');

  // Test 7: Language Detection & Translation (Kannada script)
  const knLang = await translationService.detectLanguage('ಕೋಲಾರದಲ್ಲಿ ಟೊಮೆಟೊ ಬೆಲೆ ಎಷ್ಟು?');
  assert(knLang === 'kn', 'Language Detection: Correctly identifies Kannada script');

  // Test 8: Tulu Language Template Formatting
  const tuluQueryRes = await agriChatOrchestrator.processQuery({
    message: 'Tomato price today',
    targetLang: 'tcy',
    generateAudio: true,
  });
  assert(tuluQueryRes.success === true, 'Tulu Orchestration: Returns successful output payload');
  assert(tuluQueryRes.response.includes('ತುಳು ಭಾಷೆಯ'), 'Tulu Orchestration: Appends Tulu template/disclaimer');

  // Test 9: End-To-End Orchestration Latency Budget (< 3000ms target)
  const e2eStartTime = Date.now();
  const e2eRes = await agriChatOrchestrator.processQuery({
    message: 'What is the price of onion in Nashik?',
    targetLang: 'en',
    generateAudio: true,
  });
  const e2eDuration = Date.now() - e2eStartTime;
  assert(e2eRes.success === true, 'End-to-End Orchestrator: Response returned successfully');
  assert(e2eDuration < 3500, `End-to-End Latency Budget: Executed in ${e2eDuration}ms (< 3500ms target)`);

  console.log('\n====================================================');
  console.log(`  Test Results: ${passed} PASSED, ${failed} FAILED     `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

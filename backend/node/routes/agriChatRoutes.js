import express from 'express';
import {
  processTextQuery,
  processVoiceQuery,
  getMarketPrices,
  getPesticideAdvisories,
  getGovSchemes
} from '../controllers/agriChatController.js';

const router = express.Router();

router.post('/query', processTextQuery);
router.post('/voice', processVoiceQuery);
router.get('/prices', getMarketPrices);
router.get('/pesticides', getPesticideAdvisories);
router.get('/schemes', getGovSchemes);

export default router;

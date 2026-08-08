import express from 'express';
import { getMarketPrices } from '../controllers/marketController.js';

const router = express.Router();

router.get('/market-prices', getMarketPrices);

export default router;

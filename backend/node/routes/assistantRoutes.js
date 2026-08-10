import express from 'express';
import { queryAssistant, translateMessages } from '../controllers/assistantController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/query', protect, queryAssistant);
router.post('/translate', protect, translateMessages);

export default router;

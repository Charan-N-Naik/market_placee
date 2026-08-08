import express from 'express';
import multer from 'multer';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  toggleSaveListing,
  getSavedListings
} from '../controllers/listingController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Routes for both
router.route('/')
  .get(getListings)
  .post(protect, requireRole('farmer'), upload.array('images'), createListing);

// Specific routes first to avoid catching /:id
router.get('/my', protect, requireRole('farmer'), getMyListings);
router.get('/saved', protect, requireRole('buyer'), getSavedListings);

// ID-based routes
router.route('/:id')
  .get(getListingById)
  .put(protect, requireRole('farmer'), upload.array('images'), updateListing)
  .delete(protect, requireRole('farmer'), deleteListing);

router.post('/:id/save', protect, requireRole('buyer'), toggleSaveListing);

export default router;

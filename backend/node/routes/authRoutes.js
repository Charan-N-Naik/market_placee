import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  refreshToken, 
  logoutUser, 
  googleAuth, 
  verifyEmail, 
  forgotPassword, 
  resetPassword 
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser);
router.get('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.post('/google', googleAuth);
router.get('/verify/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/me', protect, getUserProfile);
router.put('/me', protect, updateUserProfile);

export default router;

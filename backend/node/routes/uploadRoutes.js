import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../services/uploadService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

// @route   POST /api/upload
// @desc    Upload image (multipart/form-data) to Cloudinary and return CDN url
// @access  Private (Authenticated users)
router.post(
  '/',
  protect,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const file = req.files?.file?.[0] || req.files?.image?.[0] || req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded in "file" or "image" field' });
      }

      const folder = req.body.folder || 'kisanbazaar/uploads';
      const result = await uploadToCloudinary(file.buffer, folder);

      const url = result.secure_url || result.url;
      return res.status(200).json({
        success: true,
        url,
        public_id: result.public_id,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary.
 * @param {Buffer} buffer - The image buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{url: string, public_id: string}>}
 */
export function uploadToCloudinary(buffer, folder = 'kisanbazaar/crops') {
  // Fallback to data URI if Cloudinary is not configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    console.warn('Cloudinary is not configured. Falling back to base64 data URI.');
    const base64 = buffer.toString('base64');
    return Promise.resolve({
      secure_url: `data:image/jpeg;base64,${base64}`,
      url: `data:image/jpeg;base64,${base64}`,
      public_id: `mock_${Date.now()}`
    });
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error('Image upload failed'));
        } else {
          resolve({
            secure_url: result.secure_url,
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export default cloudinary;

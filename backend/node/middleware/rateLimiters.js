import rateLimit from 'express-rate-limit';

// Login rate limiter: 5 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Orders rate limiter: 30 requests per minute per user (or IP)
export const ordersLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.user?.id || req.ip;
  },
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many order requests. Rate limit is 30 requests per minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter: 10 uploads per minute per user (or IP)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.user?.id || req.ip;
  },
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Upload rate limit exceeded (10 uploads per minute). Please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

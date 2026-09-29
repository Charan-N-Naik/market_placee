import { logError } from '../services/errorLoggerService.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle MongoDB E11000 duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `This ${field} is already registered to another account. Please use a different ${field}.`;
  }
  
  console.error(`[Error] ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Record error to persistent database logger
  logError({
    type: 'expressError',
    message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    statusCode,
    userId: req.user?._id || req.user?.id || null,
    ip: req.ip,
    userAgent: req.headers ? req.headers['user-agent'] : undefined,
  }).catch(() => {});

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};


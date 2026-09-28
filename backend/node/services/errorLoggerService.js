import AppError from '../models/AppError.js';

/**
 * Log application error to database and console
 */
export const logError = async ({
  type = 'expressError',
  message,
  stack,
  url,
  method,
  statusCode,
  userId,
  ip,
  userAgent,
  metadata,
}) => {
  try {
    const errorRecord = await AppError.create({
      type,
      message: message || 'Unknown error',
      stack,
      url,
      method,
      statusCode,
      userId: userId || null,
      ip,
      userAgent,
      metadata,
    });
    return errorRecord;
  } catch (dbErr) {
    console.error('[ErrorLogger Fallback] Could not persist error to DB:', dbErr.message);
    return null;
  }
};

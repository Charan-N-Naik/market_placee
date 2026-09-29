import mongoose from 'mongoose';

const appErrorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['expressError', 'uncaughtRejection', 'uncaughtException', 'clientError'],
      default: 'expressError',
    },
    message: {
      type: String,
      required: true,
    },
    stack: String,
    url: String,
    method: String,
    statusCode: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ip: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Auto-expire error records after 30 days
appErrorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const AppError = mongoose.model('AppError', appErrorSchema);
export default AppError;

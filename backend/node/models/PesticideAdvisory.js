import mongoose from 'mongoose';

const pesticideAdvisorySchema = new mongoose.Schema({
  crop: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  pestOrDisease: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  symptoms: [String],
  approvedPesticide: {
    type: String,
    required: true,
  },
  activeIngredient: String,
  dosage: {
    type: String,
    required: true, // e.g. "2 ml per liter of water (500 ml/acre)"
  },
  applicationMethod: {
    type: String,
    default: 'Foliar spray during early morning or late evening hours.',
  },
  safetyPrecaution: {
    type: String,
    required: true, // Safety gear, gloves, mask text
  },
  waitingPeriodDays: {
    type: Number,
    default: 7, // Harvest safety waiting period in days
  },
  sourceAuthority: {
    type: String,
    default: 'ICAR & Central Insecticides Board & Registration Committee (CIBRC)',
  },
  state: {
    type: String,
    default: 'All India',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Compound index for quick lookups by crop and pest/disease
pesticideAdvisorySchema.index({ crop: 1, pestOrDisease: 1 });

const PesticideAdvisory = mongoose.model('PesticideAdvisory', pesticideAdvisorySchema);
export default PesticideAdvisory;

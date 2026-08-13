import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required'],
    },
    variety: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required (e.g., kg, quintals, tons)'],
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price is required'],
    },
    description: String,
    images: [
      {
        url: String,
        public_id: String,
      }
    ],
    harvestDate: Date,
    isOrganic: {
      type: Boolean,
      default: false,
    },
    location: {
      address: String,
      district: String,
      state: String,
      lat: Number,
      lng: Number,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    aiVerified: {
      type: Boolean,
      default: false,
    },
    premiumVerified: { type: Boolean, default: false },
    verificationReport: {
      cropName:              String,
      variety:               String,
      confidenceScore:       Number,
      healthScore:           Number,
      // New fields from multi-angle Gemini pipeline
      trustScore:            Number,
      qualityGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'Unknown'],
        default: 'Unknown',
      },
      ripeness:              String,
      freshness:             String,
      defects:               [String],
      pestDetection:         Boolean,
      estimatedShelfLife:    String,
      estimatedPricePerKg:   Number,
      storageRecommendation: String,
      summary:               String,
      analyzedAngles:        [String],
      analysisTimestamp:     Date,
      // Legacy fields kept for backwards compat
      diseaseSigns:          [String],
      estimatedPrice:        Number,
      overallAssessment:     String,
    },
    // CropVerify AI — full verification result from FastAPI microservice (port 5002)
    verification: {
      status: {
        type: String,
        enum: ['pending_review', 'verified', 'flagged', 'rejected'],
        default: 'pending_review',
      },
      trust_score:             Number,
      authenticity_score:      Number,
      authenticity_reasons:    [String],
      is_authentic:            Boolean,
      location_valid:          Boolean,
      resolved_address:        String,
      distance_from_registered_km: Number,
      geo_flags:               [String],
      disease_label:           String,
      disease_confidence:      Number,
      healthy_leaf:            Boolean,
      report_url:              String,   // Cached PDF URL (future Cloud Storage integration)
      verified_at:             Date,
      updated_at:              Date,
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'expired'],
      default: 'active',
    },
    views: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  {
    timestamps: true,
  }
);

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;

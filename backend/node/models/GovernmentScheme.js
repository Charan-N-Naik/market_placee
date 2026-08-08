import mongoose from 'mongoose';

const governmentSchemeSchema = new mongoose.Schema({
  schemeName: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
  governmentType: {
    type: String, // 'Central' | 'State'
    default: 'Central',
    enum: ['Central', 'State'],
    index: true,
  },
  state: {
    type: String,
    default: 'All India',
    index: true,
  },
  category: {
    type: String, // 'subsidy' | 'insurance' | 'credit' | 'irrigation' | 'machinery' | 'soil' | 'organic' | 'solar'
    index: true,
  },
  cropType: {
    type: String,
    default: 'All Crops',
    index: true,
  },
  farmerCategory: {
    type: String, // 'small' | 'marginal' | 'tenant' | 'all'
    default: 'all',
  },
  shortDescription: {
    type: String,
    required: true,
  },
  eligibility: {
    type: String,
    required: true,
  },
  benefits: {
    type: String,
    required: true,
  },
  applicationProcess: {
    type: String,
    required: true,
  },
  documentsRequired: [String],
  department: {
    type: String,
    default: 'Ministry of Agriculture & Farmers Welfare',
  },
  deadline: {
    type: String,
    default: 'Ongoing / Active',
  },
  status: {
    type: String, // 'active' | 'upcoming' | 'closed'
    default: 'active',
    enum: ['active', 'upcoming', 'closed'],
  },
  officialUrl: {
    type: String,
    default: 'https://myscheme.gov.in',
  },
  pdfUrl: {
    type: String,
  },
  faqs: [
    {
      question: String,
      answer: String,
    }
  ],
  keywords: [String],
  syncedAt: {
    type: Date,
    default: Date.now,
  }
});

governmentSchemeSchema.index({ governmentType: 1, state: 1, category: 1, farmerCategory: 1 });

const GovernmentScheme = mongoose.model('GovernmentScheme', governmentSchemeSchema);
export default GovernmentScheme;

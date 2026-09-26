import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, ShieldCheck, Zap, Bot, Smartphone, CheckCircle2, 
  Sparkles, Layers, Cpu, Users, Eye, HelpCircle, ArrowRight, 
  ChevronRight, Scale, Clock, ShieldAlert, Award
} from 'lucide-react';

const FEATURE_DATA = {
  'ai-verification': {
    id: 'ai-verification',
    icon: <ShieldCheck className="w-10 h-10 text-emerald-600" />,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentGradient: 'from-emerald-500 to-green-600',
    title: 'AI-Powered Quality Verification',
    tagline: 'Multi-Angle Computer Vision for 100% Transparent Crop Grading',
    summary: 'Our cutting-edge computer vision pipeline analyzes produce across multiple camera angles to automatically detect defects, calculate freshness scores, estimate remaining shelf life, and grade quality before listings are published.',
    highlights: [
      {
        icon: <Eye className="w-5 h-5 text-emerald-600" />,
        title: 'Multi-Angle Inspection',
        description: 'Farmers upload Front, Side, and Top perspectives. AI verifies consistency to prevent misleading photos.'
      },
      {
        icon: <Cpu className="w-5 h-5 text-emerald-600" />,
        title: 'Instant Defect & Pest Detection',
        description: 'Trained on 500,000+ agricultural datasets to detect rot, surface blemishes, fungal spots, and pest damage.'
      },
      {
        icon: <Award className="w-5 h-5 text-emerald-600" />,
        title: 'Official Grade Certification (A+, A, B)',
        description: 'Standardized grading eliminates disputes between bulk buyers and farmers upon delivery.'
      },
      {
        icon: <Clock className="w-5 h-5 text-emerald-600" />,
        title: 'Predictive Shelf Life & Freshness Score',
        description: 'Estimates days until peak freshness expires, giving buyers accurate timelines for transport.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Farmer Takes Real-Time Photos',
        description: 'Farmer captures harvest photos with in-app camera or uploads freshly taken produce angles.'
      },
      {
        step: '02',
        title: 'Vision AI Deep-Scan',
        description: 'Neural networks detect crop variety, color variance, skin integrity, and ripeness index within 3 seconds.'
      },
      {
        step: '03',
        title: 'Automated Inspection Certificate',
        description: 'Listing is awarded the "AI Verified" badge with public inspection metrics visible to every buyer.'
      }
    ],
    stats: [
      { label: 'Inspection Accuracy', value: '98.4%' },
      { label: 'Dispute Reduction', value: '87%' },
      { label: 'Verification Speed', value: '< 3s' },
      { label: 'Crops Supported', value: '45+' }
    ],
    faq: [
      {
        q: 'Can photos be faked or duplicated?',
        a: 'No. Our image pipeline performs duplicate hash matching and timestamp validation to ensure only original, recent photos are accepted.'
      },
      {
        q: 'What happens if a crop fails AI verification?',
        a: 'The farmer receives instant feedback highlighting why the photo was rejected (e.g. low lighting, blur, or severe defects) and guidance on how to fix it.'
      }
    ]
  },

  'lightning-listing': {
    id: 'lightning-listing',
    icon: <Zap className="w-10 h-10 text-amber-500" />,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accentGradient: 'from-amber-500 to-orange-600',
    title: 'Lightning Fast Bulk Listing',
    tagline: 'From Harvest in the Field to Live Commercial Mandi in 60 Seconds',
    summary: 'Specially engineered for bulk farmers with minimal tech experience. Includes regional language voice-typing, automated APMC price estimation, and wholesale batch configurations for truckload and container quantities.',
    highlights: [
      {
        icon: <Sparkles className="w-5 h-5 text-amber-600" />,
        title: 'Bulk Quantity Enforcement',
        description: 'Tailored for wholesale and bulk sellers with minimum thresholds (50 kg / 1 quintal) for commercial volume.'
      },
      {
        icon: <Bot className="w-5 h-5 text-amber-600" />,
        title: 'Vernacular Voice Dictation',
        description: 'Farmers can speak their crop name, variety, and location in Hindi, Kannada, Tamil, Telugu, and English.'
      },
      {
        icon: <Scale className="w-5 h-5 text-amber-600" />,
        title: 'APMC Live Benchmark Pricing',
        description: 'AI pulls latest mandi rates to suggest optimal bulk wholesale pricing that guarantees quick sales.'
      },
      {
        icon: <Layers className="w-5 h-5 text-amber-600" />,
        title: 'One-Click Duplicate & Re-list',
        description: 'Farmers harvesting recurring crops can duplicate previous listings in a single tap.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Speak or Snap',
        description: 'Use voice typing or snapshot detection to auto-fill crop name, variety, and harvest details.'
      },
      {
        step: '02',
        title: 'Set Wholesale Volume & Price',
        description: 'Enter bulk quantity (minimum 50 kg or quintals) and consult live regional mandi price benchmarks.'
      },
      {
        step: '03',
        title: 'Instant Distribution',
        description: 'Listing broadcasts instantly to thousands of verified food processors, retailers, and wholesalers.'
      }
    ],
    stats: [
      { label: 'Avg Listing Time', value: '45 sec' },
      { label: 'Wholesale Reach', value: '10,000+' },
      { label: 'Mandi Price Sync', value: 'Real-time' },
      { label: 'Languages Supported', value: '8 Languages' }
    ],
    faq: [
      {
        q: 'Why is there a minimum quantity for listings?',
        a: 'KisanBazaar is a specialized commercial bulk marketplace connecting farmers directly with business buyers, eliminating retail intermediaries for better margins.'
      },
      {
        q: 'Can I sell in quintals or tons?',
        a: 'Yes! You can specify kilograms (kg), quintals, or metric tons when creating any crop listing.'
      }
    ]
  },

  'ai-agronomist': {
    id: 'ai-agronomist',
    icon: <Bot className="w-10 h-10 text-sky-600" />,
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    accentGradient: 'from-sky-500 to-blue-600',
    title: '24/7 AI Agronomist & Mandi Advisor',
    tagline: 'Your Intelligent Advisory Partner for Real-Time Agricultural Success',
    summary: 'A conversational AI agronomist available around the clock. Powered by state-of-the-art LLMs, it offers disease diagnosis from leaf photos, hyper-local weather alerts, mandi price forecasting, and fertilizer recommendations.',
    highlights: [
      {
        icon: <Cpu className="w-5 h-5 text-sky-600" />,
        title: 'Instant Crop Disease Diagnosis',
        description: 'Upload a picture of any yellowing or spotted leaves to get immediate remedy suggestions.'
      },
      {
        icon: <Clock className="w-5 h-5 text-sky-600" />,
        title: 'Live APMC Price Intelligence',
        description: 'Ask "What is the tomato price in Kolar today vs Azadpur?" and get instant comparisons.'
      },
      {
        icon: <ShieldAlert className="w-5 h-5 text-sky-600" />,
        title: 'Hyper-Local Weather & Sowing Guidance',
        description: '7-day precipitation forecasts combined with crop stage advice to prevent waterlogging and crop loss.'
      },
      {
        icon: <Users className="w-5 h-5 text-sky-600" />,
        title: 'Multilingual Natural Voice/Chat',
        description: 'Chat naturally in Kannada, Hindi, Telugu, Marathi, and English without complicated agronomy jargon.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Ask or Snap a Question',
        description: 'Type or speak your crop issue, or upload an image of an affected leaf, stem, or harvest.'
      },
      {
        step: '02',
        title: 'AI Diagnostics & Market Cross-Check',
        description: 'The engine correlates agricultural research papers, weather radar, and mandi price tables.'
      },
      {
        step: '03',
        title: 'Actionable Guidance',
        description: 'Receive precise dosage, organic pesticide alternatives, or the most profitable day to sell your harvest.'
      }
    ],
    stats: [
      { label: 'Availability', value: '24/7/365' },
      { label: 'Diseases Detected', value: '200+' },
      { label: 'Mandi APMCs Tracked', value: '1,200+' },
      { label: 'Farmer Satisfaction', value: '96.8%' }
    ],
    faq: [
      {
        q: 'Is the AI Agronomist free for farmers?',
        a: 'Yes, basic agronomy diagnostics and live mandi pricing queries are completely free for all registered farmers.'
      },
      {
        q: 'Can the AI diagnose organic remedies?',
        a: 'Yes, the AI provides both organic (Neem oil, Jeevamrutha) and standard recommended treatments.'
      }
    ]
  },

  'direct-contact': {
    id: 'direct-contact',
    icon: <Smartphone className="w-10 h-10 text-rose-600" />,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    accentGradient: 'from-rose-500 to-pink-600',
    title: 'Seamless Direct Contact & Fair Trade',
    tagline: 'Zero Middlemen, Direct WhatsApp Negotiation, and Secure Escrow Deals',
    summary: 'Eliminate APMC commissions and middleman cartels. KisanBazaar connects verified bulk buyers directly with farmers through one-click WhatsApp chat, in-app messaging, verified phone contacts, and delivery agent logistics.',
    highlights: [
      {
        icon: <Users className="w-5 h-5 text-rose-600" />,
        title: '1-Click WhatsApp Negotiation',
        description: 'Pre-filled messages with crop name, quantity, and requested price make deal closing instantaneous.'
      },
      {
        icon: <ShieldCheck className="w-5 h-5 text-rose-600" />,
        title: 'Verified Farmer & Buyer Profiles',
        description: 'Government ID verification, farm geotagging, and GSTIN validation ensure authentic transactions.'
      },
      {
        icon: <Award className="w-5 h-5 text-rose-600" />,
        title: 'End-to-End Delivery Coordination',
        description: 'Integrated delivery agents and truck drivers calculate per-km freight quotes directly in the app.'
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-rose-600" />,
        title: '100% Commission-Free Listings',
        description: 'Farmers keep full value of their produce without arbitrary commission cuts from commission agents.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Buyer Discovers Verified Crop',
        description: 'Buyer browses listings filtered by state, crop grade, bulk volume, and distance.'
      },
      {
        step: '02',
        title: 'Direct Negotiation',
        description: 'Buyer connects with farmer via WhatsApp or phone with automatically formatted deal terms.'
      },
      {
        step: '03',
        title: 'Seamless Pickup & Dispatch',
        description: 'Delivery agent accepts dispatch job with live GPS tracking from farm gate to buyer warehouse.'
      }
    ],
    stats: [
      { label: 'Farmer Earnings Boost', value: '+28%' },
      { label: 'Commission Fee', value: '0%' },
      { label: 'Verified Partners', value: '15,000+' },
      { label: 'Transit Safety', value: '100% Insured' }
    ],
    faq: [
      {
        q: 'Does KisanBazaar take a commission on bulk sales?',
        a: 'No! Unlike traditional APMC mandis that deduct 6% to 12% in commission fees, our direct contact model is 100% commission-free.'
      },
      {
        q: 'How is transport arranged?',
        a: 'Our platform has integrated delivery agents and verified local drivers who accept pickup jobs directly through their dedicated delivery portal.'
      }
    ]
  }
};

export default function FeatureDetailPage() {
  const { featureId } = useParams();
  const navigate = useNavigate();

  // Scroll to top on mount or feature change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [featureId]);

  const feature = FEATURE_DATA[featureId] || FEATURE_DATA['ai-verification'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${feature.badgeColor}`}>
              KisanBazaar Feature
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm relative overflow-hidden mb-10"
        >
          <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${feature.accentGradient}`}></div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
              {feature.icon}
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${feature.badgeColor}`}>
                Feature Spotlight
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 mb-1 tracking-tight">
                {feature.title}
              </h1>
              <p className="text-base sm:text-lg font-semibold text-slate-500">
                {feature.tagline}
              </p>
            </div>
          </div>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal bg-slate-50/70 p-6 rounded-2xl border border-slate-100">
            {feature.summary}
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
            {feature.stats.map((s, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{s.value}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Key Highlights / Capabilities */}
        <div className="mb-12">
          <div className="text-center sm:text-left mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Core Capabilities & Technical Advantages</h2>
            <p className="text-slate-500 text-sm font-medium">How this technology empowers farmers and bulk buyers</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {feature.highlights.map((h, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {h.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{h.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{h.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Workflow */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm mb-12">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">How It Works in Practice</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Simple, automated, and fail-safe at every stage</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {feature.howItWorks.map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    Step {step.step}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-slate-400" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {feature.faq.map((item, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-base font-bold text-slate-900 mb-2">{item.q}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation & Other Features */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Explore Other KisanBazaar Innovations</h3>
            <p className="text-sm text-slate-400">Discover all tools engineered for modern agriculture and bulk trade.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-3 rounded-xl bg-white text-slate-900 font-black text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Homepage
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

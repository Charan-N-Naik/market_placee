import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, ShieldCheck, Zap, Bot, Smartphone, CheckCircle2, 
  Sparkles, Cpu, Users, Eye, HelpCircle, 
  Scale, Clock, Award
} from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

const FEATURE_DATA_EN = {
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
        icon: <Award className="w-5 h-5 text-amber-600" />,
        title: '1-Click Auto Social Sharing',
        description: 'Instantly broadcasts verified wholesale listings to local buyer Telegram, WhatsApp, and APMC trader groups.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'Voice-Type or Quick Tap',
        description: 'Farmer enters crop details in seconds using native audio dictation or rapid dropdowns.'
      },
      {
        step: '02',
        title: 'AI Price Recommendation',
        description: 'System suggests fair market pricing based on current APMC rates in adjacent districts.'
      },
      {
        step: '03',
        title: 'Instant Commercial Publish',
        description: 'Listing goes live instantly and notifies verified bulk buyers in the distribution radius.'
      }
    ],
    stats: [
      { label: 'Listing Time', value: '58 sec' },
      { label: 'Direct Inquiries', value: '3.4x Faster' },
      { label: 'APMC Markets Synced', value: '1,200+' },
      { label: 'Voice Accuracy', value: '96.2%' }
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
        icon: <Sparkles className="w-5 h-5 text-sky-600" />,
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

const FEATURE_DATA_KN = {
  'ai-verification': {
    id: 'ai-verification',
    icon: <ShieldCheck className="w-10 h-10 text-emerald-600" />,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentGradient: 'from-emerald-500 to-green-600',
    title: 'AI-ಆಧಾರಿತ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ',
    tagline: '100% ಪಾರದರ್ಶಕ ಬೆಳೆ ವರ್ಗೀಕರಣಕ್ಕಾಗಿ ಬಹು-ಕೋನ ಕಂಪ್ಯೂಟರ್ ದೃಷ್ಟಿ ತಂತ್ರಜ್ಞಾನ',
    summary: 'ನಮ್ಮ ಅತ್ಯಾಧುನಿಕ ಕಂಪ್ಯೂಟರ್ ದೃಷ್ಟಿ ವ್ಯವಸ್ಥೆಯು ಬೆಳೆಗಳನ್ನು ಬಹು ಕ್ಯಾಮೆರಾ ಕೋನಗಳಲ್ಲಿ ವಿಶ್ಲೇಷಿಸಿ ದೋಷಗಳನ್ನು ಪತ್ತೆಹಚ್ಚುತ್ತದೆ, ತಾಜಾತನ ಸ್ಕೋರ್ ನೀಡುತ್ತದೆ ಮತ್ತು ಪಟ್ಟಿ ಪ್ರಕಟಿಸುವ ಮುನ್ನವೇ ಗುಣಮಟ್ಟವನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನಿರ್ಧರಿಸುತ್ತದೆ.',
    highlights: [
      {
        icon: <Eye className="w-5 h-5 text-emerald-600" />,
        title: 'ಬಹು-ಕೋನ ಪರಿಶೀಲನೆ',
        description: 'ರೈತರು ಮುಂಭಾಗ, ಬದಿ ಮತ್ತು ಮೇಲ್ಭಾಗದ ಕೋನಗಳಲ್ಲಿ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡುತ್ತಾರೆ. ನಕಲಿ ಫೋಟೋ ತಡೆಯಲು AI ಪರಿಶೀಲಿಸುತ್ತದೆ.'
      },
      {
        icon: <Cpu className="w-5 h-5 text-emerald-600" />,
        title: 'ತ್ವರಿತ ಕೀಟ ಮತ್ತು ಕೊಳೆತ ಪತ್ತೆ',
        description: '5,00,000+ ಕೃಷಿ ದತ್ತಾಂಶಗಳೊಂದಿಗೆ ತರಬೇತಿ ಪಡೆದ AI ಕೊಳೆತ, ಶಿಲೀಂಧ್ರ ಕಲೆಗಳು ಮತ್ತು ಕೀಟ ಹಾನಿಯನ್ನು ತಕ್ಷಣ ಗುರುತಿಸುತ್ತದೆ.'
      },
      {
        icon: <Award className="w-5 h-5 text-emerald-600" />,
        title: 'ಅಧಿಕೃತ ಗ್ರೇಡ್ ಪ್ರಮಾಣೀಕರಣ (A+, A, B)',
        description: 'ಪ್ರಮಾಣಿತ ಗ್ರೇಡಿಂಗ್ ಡೆಲಿವರಿ ಸಮಯದಲ್ಲಿ ಖರೀದಿದಾರರು ಮತ್ತು ರೈತರ ನಡುವಿನ ವಿವಾದಗಳನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತಪ್ಪಿಸುತ್ತದೆ.'
      },
      {
        icon: <Clock className="w-5 h-5 text-emerald-600" />,
        title: 'ಶೆಲ್ಫ್ ಜೀವಿತಾವಧಿ ಮತ್ತು ತಾಜಾತನ ಸ್ಕೋರ್',
        description: 'ಬೆಳೆಯ ಗರಿಷ್ಠ ತಾಜಾತನದ ದಿನಗಳನ್ನು ಮುಂಚಿತವಾಗಿಯೇ ಅಂದಾಜಿಸಿ ಖರೀದಿದಾರರಿಗೆ ನಿಖರ ಸಾರಿಗೆ ಸಮಯ ನೀಡುತ್ತದೆ.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'ರೈತರು ನೈಜ ಫೋಟೋಗಳನ್ನು ಸೆರೆಹಿಡಿಯುತ್ತಾರೆ',
        description: 'ಇನ್-ಆ್ಯಪ್ ಕ್ಯಾಮೆರಾ ಬಳಸಿ ಕಟಾವು ಮಾಡಿದ ತಾಜಾ ಬೆಳೆಯ ಕೋನಗಳನ್ನು ರೈತರು ಸುಲಭವಾಗಿ ಸೆರೆಹಿಡಿಯುತ್ತಾರೆ.'
      },
      {
        step: '02',
        title: 'ವಿಷನ್ AI ಡೀಪ್-ಸ್ಕ್ಯಾನ್',
        description: 'ನ್ಯೂರಲ್ ನೆಟ್‌ವರ್ಕ್ ಕೇವಲ 3 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಬೆಳೆಯ ತಳಿ, ಬಣ್ಣದ ವ್ಯತ್ಯಾಸ, ಸಿಪ್ಪೆಯ ಶುದ್ಧತೆ ಮತ್ತು ಮಾಗುವ ಹಂತವನ್ನು ಪತ್ತೆ ಮಾಡುತ್ತದೆ.'
      },
      {
        step: '03',
        title: 'ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನಾ ಪ್ರಮಾಣಪತ್ರ',
        description: 'ಪ್ರತಿ ಪಟ್ಟಿಗೆ "AI ಪರಿಶೀಲಿತ" ಬ್ಯಾಡ್ಜ್ ನೀಡಲಾಗುತ್ತದೆ, ಇದು ಸಾರ್ವಜನಿಕವಾಗಿ ಪ್ರತಿಯೊಬ್ಬ ಖರೀದಿದಾರರಿಗೂ ಗೋಚರಿಸುತ್ತದೆ.'
      }
    ],
    stats: [
      { label: 'ತಪಾಸಣೆ ನಿಖರತೆ', value: '98.4%' },
      { label: 'ವಿವಾದ ಕಡಿತ', value: '87%' },
      { label: 'ಪರಿಶೀಲನಾ ವೇಗ', value: '< 3 ಸೆ' },
      { label: 'ಬೆಂಬಲಿತ ಬೆಳೆಗಳು', value: '45+' }
    ],
    faq: [
      {
        q: 'ಫೋಟೋಗಳನ್ನು ನಕಲಿ ಅಥವಾ ಮರುಬಳಕೆ ಮಾಡಬಹುದೇ?',
        a: 'ಇಲ್ಲ. ನಮ್ಮ ಇಮೇಜ್ ಪೈಪ್‌ಲೈನ್ ಹ್ಯಾಶ್ ಹೋಲಿಕೆ ಮತ್ತು ಟೈಮ್‌ಸ್ಟ್ಯಾಂಪ್ ಪರಿಶೀಲನೆ ನಡೆಸಿ ನೈಜ, ಇತ್ತೀಚಿನ ಫೋಟೋಗಳನ್ನು ಮಾತ್ರ ಸ್ವೀಕರಿಸುತ್ತದೆ.'
      },
      {
        q: 'ಬೆಳೆ AI ಪರಿಶೀಲನೆಯಲ್ಲಿ ವಿಫಲವಾದರೆ ಏನಾಗುತ್ತದೆ?',
        a: 'ಫೋಟೋ ಏಕೆ ತಿರಸ್ಕರಿಸಲ್ಪಟ್ಟಿತು (ಕಡಿಮೆ ಬೆಳಕು, ಮಸುಕು ಅಥವಾ ತೀವ್ರ ದೋಷ) ಎಂಬುದನ್ನು ರೈತರಿಗೆ ತಕ್ಷಣ ತಿಳಿಸಿ ಸರಿಪಡಿಸುವ ಮಾರ್ಗದರ್ಶನ ನೀಡಲಾಗುತ್ತದೆ.'
      }
    ]
  },

  'lightning-listing': {
    id: 'lightning-listing',
    icon: <Zap className="w-10 h-10 text-amber-500" />,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accentGradient: 'from-amber-500 to-orange-600',
    title: 'ಮಿಂಚಿನ ವೇಗದ ಸಗಟು ಪಟ್ಟಿ',
    tagline: 'ಹೊಲದಿಂದ 60 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಲೈವ್ ವಾಣಿಜ್ಯ ಮಂಡಿಗೆ',
    summary: 'ಕಡಿಮೆ ತಂತ್ರಜ್ಞಾನ ಅನುಭವವಿರುವ ರೈತರಿಗಾಗಿ ಸರಳವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ. ಸ್ಥಳೀಯ ಭಾಷೆಯ ಧ್ವನಿ ಟೈಪಿಂಗ್, ಸ್ವಯಂಚಾಲಿತ APMC ಬೆಲೆ ಅಂದಾಜು ಮತ್ತು ಟ್ರಕ್‌ಲೋಡ್ ಸಗಟು ಬ್ಯಾಚ್‌ಗಳ ಸಂರಚನೆ ಒಳಗೊಂಡಿದೆ.',
    highlights: [
      {
        icon: <Sparkles className="w-5 h-5 text-amber-600" />,
        title: 'ಬೃಹತ್ ಪ್ರಮಾಣದ ಸಗಟು ನಿರ್ವಹಣೆ',
        description: 'ವಾಣಿಜ್ಯ ವ್ಯಾಪಾರಕ್ಕಾಗಿ ಕನಿಷ್ಠ 50 ಕೆಜಿ / 1 ಕ್ವಿಂಟಾಲ್ ಮಿತಿಯೊಂದಿಗೆ ಸಗಟು ಮಾರಾಟಗಾರರಿಗೆ ಸರಿಹೊಂದಿಸಲಾಗಿದೆ.'
      },
      {
        icon: <Bot className="w-5 h-5 text-amber-600" />,
        title: 'ಕನ್ನಡ ಧ್ವನಿ ಟೈಪಿಂಗ್',
        description: 'ರೈತರು ತಮ್ಮ ಬೆಳೆಯ ಹೆಸರು, ತಳಿ ಮತ್ತು ಸ್ಥಳವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುವ ಮೂಲಕವೇ ನಮೂದಿಸಬಹುದು.'
      },
      {
        icon: <Scale className="w-5 h-5 text-amber-600" />,
        title: 'ಲೈವ್ APMC ಮಂಡಿ ಬೆಲೆ ಮಾರ್ಗದರ್ಶಿ',
        description: 'ತ್ವರಿತ ಮಾರಾಟ ಖಾತರಿಪಡಿಸಲು AI ಸಮೀಪದ ಮಂಡಿಗಳ ಇತ್ತೀಚಿನ ದರಗಳನ್ನು ಆಧರಿಸಿ ಉತ್ತಮ ಬೆಲೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ.'
      },
      {
        icon: <Award className="w-5 h-5 text-amber-600" />,
        title: '1-ಕ್ಲಿಕ್ ಸಾಮಾಜಿಕ ಹಂಚಿಕೆ',
        description: 'ಪರಿಶೀಲಿತ ಸಗಟು ಪಟ್ಟಿಗಳನ್ನು ತಕ್ಷಣ ಸ್ಥಳೀಯ ಖರೀದಿದಾರರ ಟೆಲಿಗ್ರಾಂ, ವಾಟ್ಸಾಪ್ ಮತ್ತು ಮಂಡಿ ಗುಂಪುಗಳಿಗೆ ರವಾನಿಸುತ್ತದೆ.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'ಧ್ವನಿ ಮೂಲಕ ಮಾತನಾಡಿ ಅಥವಾ ಟ್ಯಾಪ್ ಮಾಡಿ',
        description: 'ಸ್ಥಳೀಯ ಭಾಷೆಯ ಧ್ವನಿ ಮೂಲಕ ರೈತರು ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಬೆಳೆಯ ವಿವರಗಳನ್ನು ನಮೂದಿಸುತ್ತಾರೆ.'
      },
      {
        step: '02',
        title: 'AI ಬೆಲೆ ಶಿಫಾರಸು',
        description: 'ಸಮೀಪದ ಜಿಲ್ಲೆಗಳಲ್ಲಿನ ಪ್ರಸ್ತುತ APMC ಮಂಡಿ ದರಗಳನ್ನು ಆಧರಿಸಿ ನ್ಯಾಯೋಚಿತ ಬೆಲೆಯನ್ನು ವ್ಯವಸ್ಥೆ ಸೂಚಿಸುತ್ತದೆ.'
      },
      {
        step: '03',
        title: 'ತಕ್ಷಣದ ವಾಣಿಜ್ಯ ಪ್ರಕಟಣೆ',
        description: 'ಪಟ್ಟಿ ತಕ್ಷಣ ಪ್ರಕಟಗೊಂಡು ಸುತ್ತಮುತ್ತಲಿನ ಪರಿಶೀಲಿತ ಸಗಟು ಖರೀದಿದಾರರಿಗೆ ತಕ್ಷಣ ಅಧಿಸೂಚನೆ ನೀಡುತ್ತದೆ.'
      }
    ],
    stats: [
      { label: 'ಪಟ್ಟಿ ಮಾಡುವ ಸಮಯ', value: '58 ಸೆ' },
      { label: 'ನೇರ ವಿಚಾರಣೆಗಳು', value: '3.4x ವೇಗ' },
      { label: 'ಸಂಪರ್ಕಿತ APMC ಮಂಡಿಗಳು', value: '1,200+' },
      { label: 'ಧ್ವನಿ ನಿಖರತೆ', value: '96.2%' }
    ],
    faq: [
      {
        q: 'ಪಟ್ಟಿಗಳಿಗೆ ಕನಿಷ್ಠ ಪ್ರಮಾಣದ ಮಿತಿ ಏಕೆ ಇದೆ?',
        a: 'ಕಿಸಾನ್‌ಬಜಾರ್ ನೇರ ಸಗಟು ಮಾರುಕಟ್ಟೆಯಾಗಿದ್ದು, ಉತ್ತಮ ಲಾಭಕ್ಕಾಗಿ ಚಿಲ್ಲರೆ ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ರೈತರನ್ನು ನೇರವಾಗಿ ದೊಡ್ಡ ಖರೀದಿದಾರರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.'
      },
      {
        q: 'ನಾನು ಕ್ವಿಂಟಾಲ್ ಅಥವಾ ಟನ್‌ಗಳಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬಹುದೇ?',
        a: 'ಹೌದು! ಬೆಳೆ ಪಟ್ಟಿ ರಚಿಸುವಾಗ ನೀವು ಕಿಲೋಗ್ರಾಂ (ಕೆಜಿ), ಕ್ವಿಂಟಾಲ್ ಅಥವಾ ಮೆಟ್ರಿಕ್ ಟನ್‌ಗಳನ್ನು ಸುಲಭವಾಗಿ ಆಯ್ಕೆ ಮಾಡಬಹುದು.'
      }
    ]
  },

  'ai-agronomist': {
    id: 'ai-agronomist',
    icon: <Bot className="w-10 h-10 text-sky-600" />,
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    accentGradient: 'from-sky-500 to-blue-600',
    title: '24/7 AI ಕೃಷಿ ತಜ್ಞ & ಮಂಡಿ ಸಲಹೆಗಾರ',
    tagline: 'ನೈಜ ಸಮಯದ ಕೃಷಿ ಯಶಸ್ಸಿಗೆ ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ಡಿಜಿಟಲ್ ಪಾಲುದಾರ',
    summary: '24 ಗಂಟೆಯೂ ಲಭ್ಯವಿರುವ ಸಂಭಾಷಣಾ AI ಕೃಷಿ ತಜ್ಞ. ಎಲೆ ಫೋಟೋಗಳಿಂದ ರೋಗ ಪತ್ತೆ, ಸ್ಥಳೀಯ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳು, ಮಂಡಿ ಬೆಲೆ ಮುನ್ಸೂಚನೆ ಮತ್ತು ನೈಸರ್ಗಿಕ ಸಾವಯವ ಗೊಬ್ಬರ ಸಲಹೆಗಳನ್ನು ನೀಡುತ್ತದೆ.',
    highlights: [
      {
        icon: <Cpu className="w-5 h-5 text-sky-600" />,
        title: 'ತ್ವರಿತ ಬೆಳೆ ರೋಗ ಪತ್ತೆ',
        description: 'ಹಳದಿ ಅಥವಾ ಕಲೆಯುಳ್ಳ ಎಲೆಗಳ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ತಕ್ಷಣ ನಿಖರ ಪರಿಹಾರ ಸಲಹೆಗಳನ್ನು ಪಡೆಯಿರಿ.'
      },
      {
        icon: <Clock className="w-5 h-5 text-sky-600" />,
        title: 'ಲೈವ್ APMC ಮಂಡಿ ಬೆಲೆ ಮಾಹಿತಿ',
        description: '"ಇಂದು ಕೋಲಾರ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಟೊಮೆಟೊ ಬೆಲೆ ಎಷ್ಟು?" ಎಂದು ಕೇಳಿ ತಕ್ಷಣ ಹೋಲಿಕೆಗಳನ್ನು ಪಡೆಯಿರಿ.'
      },
      {
        icon: <Sparkles className="w-5 h-5 text-sky-600" />,
        title: 'ಸ್ಥಳೀಯ ಹವಾಮಾನ & ಬಿತ್ತನೆ ಮಾರ್ಗದರ್ಶನ',
        description: '7-ದಿನಗಳ ಮಳೆ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಬೆಳೆ ಹಂತದ ಸಲಹೆಗಳ ಮೂಲಕ ಬೆಳೆ ಹಾನಿಯನ್ನು ತಡೆಯಿರಿ.'
      },
      {
        icon: <Users className="w-5 h-5 text-sky-600" />,
        title: 'ಸ್ವಾಭಾವಿಕ ಕನ್ನಡ ಧ್ವನಿ / ಚಾಟ್',
        description: 'ಕ್ಲಿಷ್ಟಕರ ವೈಜ್ಞಾನಿಕ ಪದಗಳಿಲ್ಲದೆ ಸರಳ ಕನ್ನಡದಲ್ಲೇ ನೈಸರ್ಗಿಕವಾಗಿ ಪ್ರಶ್ನೆ ಕೇಳಿ ಉತ್ತರ ಪಡೆಯಿರಿ.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'ಪ್ರಶ್ನೆ ಕೇಳಿ ಅಥವಾ ಫೋಟೋ ಕ್ಲಿಕ್ ಮಾಡಿ',
        description: 'ನಿಮ್ಮ ಬೆಳೆಯ ಸಮಸ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಪೀಡಿತ ಎಲೆಯ ಫೋಟೋವನ್ನು ಸುಲಭವಾಗಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.'
      },
      {
        step: '02',
        title: 'AI ವಿಶ್ಲೇಷಣೆ & ಮಾರುಕಟ್ಟೆ ಪರಿಶೀಲನೆ',
        description: 'ವ್ಯವಸ್ಥೆಯು ಕೃಷಿ ಸಂಶೋಧನೆಗಳು, ಹವಾಮಾನ ಡೇಟಾ ಮತ್ತು ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ತುಲನೆ ಮಾಡುತ್ತದೆ.'
      },
      {
        step: '03',
        title: 'ಕಾರ್ಯಸಾಧ್ಯ ಪರಿಹಾರ',
        description: 'ನಿಖರ ಔಷಧ ಪ್ರಮಾಣ, ಸಾವಯವ ಕೀಟನಾಶಕ ಪರ್ಯಾಯಗಳು ಅಥವಾ ಬೆಳೆ ಮಾರಲು ಹೆಚ್ಚು ಲಾಭದಾಯಕ ದಿನದ ಸಲಹೆ ಪಡೆಯಿರಿ.'
      }
    ],
    stats: [
      { label: 'ಲಭ್ಯತೆ', value: '24/7/365' },
      { label: 'ಪತ್ತೆಹಚ್ಚುವ ರೋಗಗಳು', value: '200+' },
      { label: 'ಟ್ರ್ಯಾಕ್ ಮಾಡಿದ APMCಗಳು', value: '1,200+' },
      { label: 'ರೈತರ ತೃಪ್ತಿ', value: '96.8%' }
    ],
    faq: [
      {
        q: 'AI ಕೃಷಿ ತಜ್ಞ ರೈತರಿಗೆ ಉಚಿತವೇ?',
        a: 'ಹೌದು, ಎಲ್ಲಾ ನೋಂದಾಯಿತ ರೈತರಿಗೆ ಮೂಲಭೂತ ಬೆಳೆ ರೋಗ ಪತ್ತೆ ಮತ್ತು ಲೈವ್ ಮಂಡಿ ಬೆಲೆ ವಿಚಾರಣೆಗಳು ಸಂಪೂರ್ಣವಾಗಿ ಉಚಿತ.'
      },
      {
        q: 'AI ಸಾವಯವ ಪರಿಹಾರಗಳನ್ನು ಸೂಚಿಸುತ್ತದೆಯೇ?',
        a: 'ಹೌದು, AI ನೈಸರ್ಗಿಕ ಸಾವಯವ (ಬೇವಿನ ಎಣ್ಣೆ, ಜೀವಾಮೃತ) ಮತ್ತು ಪ್ರಮಾಣಿತ ಶಿಫಾರಸು ಪರಿಹಾರಗಳೆರಡನ್ನೂ ನೀಡುತ್ತದೆ.'
      }
    ]
  },

  'direct-contact': {
    id: 'direct-contact',
    icon: <Smartphone className="w-10 h-10 text-rose-600" />,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    accentGradient: 'from-rose-500 to-pink-600',
    title: 'ತಡೆರಹಿತ ನೇರ ಸಂಪರ್ಕ & ನ್ಯಾಯೋಚಿತ ವ್ಯಾಪಾರ',
    tagline: 'ಶೂನ್ಯ ಮಧ್ಯವರ್ತಿಗಳು, ನೇರ WhatsApp ಮಾತುಕತೆ ಮತ್ತು ಸುರಕ್ಷಿತ ವಹಿವಾಟುಗಳು',
    summary: 'ಮಧ್ಯವರ್ತಿಗಳ ಕಮಿಷನ್ ರದ್ದುಗೊಳಿಸಿ. ಕಿಸಾನ್ ಬಜಾರ್ ಪರಿಶೀಲಿಸಿದ ಬೃಹತ್ ಖರೀದಿದಾರರನ್ನು ನೇರವಾಗಿ ರೈತರೊಂದಿಗೆ 1-ಕ್ಲಿಕ್ ವಾಟ್ಸಾಪ್, ಇನ್-ಆ್ಯಪ್ ಸಂದೇಶ, ಪರಿಶೀಲಿತ ಫೋನ್ ಸಂಪರ್ಕ ಮತ್ತು ಡೆಲಿವರಿ ಏಜೆಂಟ್ ನೆಟ್‌ವರ್ಕ್ ಮೂಲಕ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    highlights: [
      {
        icon: <Users className="w-5 h-5 text-rose-600" />,
        title: '1-ಕ್ಲಿಕ್ WhatsApp ಮಾತುಕತೆ',
        description: 'ಬೆಳೆಯ ಹೆಸರು, ಪ್ರಮಾಣ ಮತ್ತು ಅಪೇಕ್ಷಿತ ಬೆಲೆಯೊಂದಿಗೆ ಮುಂಚಿತವಾಗಿ ರಚಿಸಲಾದ ಸಂದೇಶಗಳು ತಕ್ಷಣ ಒಪ್ಪಂದ ಮುಕ್ತಾಯಗೊಳಿಸುತ್ತವೆ.'
      },
      {
        icon: <ShieldCheck className="w-5 h-5 text-rose-600" />,
        title: 'ಪರಿಶೀಲಿತ ರೈತ & ಖರೀದಿದಾರ ಪ್ರೊಫೈಲ್‌ಗಳು',
        description: 'ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿ, ಕೃಷಿ ಜಿಯೋಟ್ಯಾಗಿಂಗ್ ಮತ್ತು ಜಿಎಸ್‌ಟಿಐಎನ್ ಪರಿಶೀಲನೆಯು ನೈಜ ವಹಿವಾಟನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ.'
      },
      {
        icon: <Award className="w-5 h-5 text-rose-600" />,
        title: 'ಸಂಪೂರ್ಣ ಡೆಲಿವರಿ ಸಮನ್ವಯ',
        description: 'ಸಂಯೋಜಿತ ಡೆಲಿವರಿ ಏಜೆಂಟರು ಮತ್ತು ಟ್ರಕ್ ಚಾಲಕರು ಪ್ರತಿ ಕಿಲೋಮೀಟರ್ ಸಾರಿಗೆ ದರವನ್ನು ನೇರವಾಗಿ ಲೆಕ್ಕಾಚಾರ ಮಾಡುತ್ತಾರೆ.'
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-rose-600" />,
        title: '100% ಕಮಿಷನ್-ಮುಕ್ತ ಪಟ್ಟಿಗಳು',
        description: 'ದಲ್ಲಾಳಿಗಳ ಯಾವುದೇ ಕಮಿಷನ್ ಕಡಿತವಿಲ್ಲದೆ ರೈತರು ತಮ್ಮ ಬೆಳೆಯ ಸಂಪೂರ್ಣ ಮೌಲ್ಯವನ್ನು ತಾವೇ ಪಡೆಯುತ್ತಾರೆ.'
      }
    ],
    howItWorks: [
      {
        step: '01',
        title: 'ಖರೀದಿದಾರರು ಪರಿಶೀಲಿತ ಬೆಳೆ ಹುಡುಕುತ್ತಾರೆ',
        description: 'ರಾಜ್ಯ, ಬೆಳೆ ಗ್ರೇಡ್, ಸಗಟು ಪ್ರಮಾಣ ಮತ್ತು ಅಂತರದ ಪ್ರಕಾರ ಫಿಲ್ಟರ್ ಮಾಡಿ ಪಟ್ಟಿಗಳನ್ನು ವೀಕ್ಷಿಸುತ್ತಾರೆ.'
      },
      {
        step: '02',
        title: 'ನೇರ ಮಾತುಕತೆ',
        description: 'ಖರೀದಿದಾರರು ಸ್ವಯಂಚಾಲಿತ ನಿಯಮಗಳೊಂದಿಗೆ WhatsApp ಅಥವಾ ಫೋನ್ ಮೂಲಕ ನೇರವಾಗಿ ರೈತರೊಂದಿಗೆ ಸಂಪರ್ಕ ಸಾಧಿಸುತ್ತಾರೆ.'
      },
      {
        step: '03',
        title: 'ತಡೆರಹಿತ ಪಿಕಪ್ ಮತ್ತು ರವಾನೆ',
        description: 'ಡೆಲಿವರಿ ಏಜೆಂಟ್ ಹೊಲದ ಗೇಟ್‌ನಿಂದ ಖರೀದಿದಾರರ ಗೋದಾಮಿನವರೆಗೆ ಲೈವ್ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್‌ನೊಂದಿಗೆ ಸರಕನ್ನು ರವಾನಿಸುತ್ತಾರೆ.'
      }
    ],
    stats: [
      { label: 'ರೈತರ ಗಳಿಕೆ ಹೆಚ್ಚಳ', value: '+28%' },
      { label: 'ಕಮಿಷನ್ ಶುಲ್ಕ', value: '0%' },
      { label: 'ಪರಿಶೀಲಿತ ಪಾಲುದಾರರು', value: '15,000+' },
      { label: 'ಸಾರಿಗೆ ಭದ್ರತೆ', value: '100% ಸುರಕ್ಷಿತ' }
    ],
    faq: [
      {
        q: 'ಕಿಸಾನ್‌ಬಜಾರ್ ಸಗಟು ಮಾರಾಟದಲ್ಲಿ ಕಮಿಷನ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆಯೇ?',
        a: 'ಇಲ್ಲ! ಸಾಂಪ್ರದಾಯಿಕ APMC ಮಂಡಿಗಳು ಶೇಕಡಾ 6% ರಿಂದ 12% ಕಮಿಷನ್ ಕಡಿತಗೊಳಿಸುವಂತಲ್ಲದೆ, ನಮ್ಮ ನೇರ ಮಾದರಿಯು 100% ಕಮಿಷನ್ ಮುಕ್ತವಾಗಿದೆ.'
      },
      {
        q: 'ಸಾರಿಗೆ ಹೇಗೆ ವ್ಯವಸ್ಥೆ ಮಾಡಲಾಗುತ್ತದೆ?',
        a: 'ನಮ್ಮ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನಲ್ಲಿ ನೋಂದಾಯಿತ ಸ್ಥಳೀಯ ಡೆಲಿವರಿ ಏಜೆಂಟರು ತಮ್ಮ ಮೀಸಲಾದ ಪೋರ್ಟಲ್ ಮೂಲಕ ಪಿಕಪ್ ಕೆಲಸಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತಾರೆ.'
      }
    ]
  }
};

export default function FeatureDetailPage() {
  const { featureId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Scroll to top on mount or feature change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [featureId]);

  const isKn = (i18n.language || '').startsWith('kn');
  const dataSource = isKn ? FEATURE_DATA_KN : FEATURE_DATA_EN;
  const feature = dataSource[featureId] || dataSource['ai-verification'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isKn ? 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ' : 'Back to Home'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <LanguageToggle role="default" />
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${feature.badgeColor} hidden sm:inline-block`}>
              {isKn ? 'ಕಿಸಾನ್‌ಬಜಾರ್ ವೈಶಿಷ್ಟ್ಯ' : 'KisanBazaar Feature'}
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner shrink-0">
              {feature.icon}
            </div>
            <div>
              <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${feature.badgeColor}`}>
                {isKn ? 'ವಿಶೇಷ ನೋಟ' : 'Feature Spotlight'}
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
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="block text-2xl sm:text-3xl font-black text-slate-900 mb-1">{s.value}</span>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Key Highlights Grid */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isKn ? 'ಪ್ರಮುಖ ಸಾಮರ್ಥ್ಯಗಳು & ವೈಶಿಷ್ಟ್ಯಗಳು' : 'Key Capabilities & Engineering Highlights'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {feature.highlights.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4 hover:shadow-md transition-shadow"
              >
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isKn ? 'ವ್ಯವಸ್ಥೆ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ' : 'How the System Works'}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {feature.howItWorks.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-lg flex items-center justify-center mb-4 shadow-md">
                  {step.step}
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-slate-400" />
            <span>{isKn ? 'ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು' : 'Frequently Asked Questions'}</span>
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

      </main>
    </div>
  );
}

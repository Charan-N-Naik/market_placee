import PesticideAdvisory from '../models/PesticideAdvisory.js';
import GovernmentScheme from '../models/GovernmentScheme.js';

export async function seedAgriData() {
  try {
    const pesticideCount = await PesticideAdvisory.countDocuments();
    if (pesticideCount === 0) {
      console.log('[Seed] Seeding initial ICAR approved pesticide advisories...');
      await PesticideAdvisory.insertMany([
        {
          crop: 'Tomato',
          pestOrDisease: 'Early Blight',
          symptoms: ['Concentric dark spots on lower leaves', 'Yellow halo around brown lesions'],
          approvedPesticide: 'Mancozeb 75% WP',
          activeIngredient: 'Mancozeb',
          dosage: '2.0 - 2.5 grams per liter of water (approx. 500-600g per acre)',
          applicationMethod: 'Foliar spray thoroughly covering upper and lower leaf surfaces during early morning.',
          safetyPrecaution: 'Wear protective mask, gloves, and long sleeves. Do not spray against wind. Avoid eating/smoking during application.',
          waitingPeriodDays: 7,
          sourceAuthority: 'ICAR-IIHR (Indian Institute of Horticultural Research) & CIBRC Approved Guidelines',
          state: 'Karnataka',
        },
        {
          crop: 'Tomato',
          pestOrDisease: 'Fruit Borer (Helicoverpa armigera)',
          symptoms: ['Bored holes in fruits', 'Frass visible near stem base', 'Damaged young shoots'],
          approvedPesticide: 'Chlorantraniliprole 18.5% SC',
          activeIngredient: 'Chlorantraniliprole',
          dosage: '0.3 ml per liter of water (60 ml per acre)',
          applicationMethod: 'Foliar spray at early instar stage or flowering.',
          safetyPrecaution: 'Ensure safety goggles, gloves, and apron. Keep children and domestic animals away from treated field.',
          waitingPeriodDays: 3,
          sourceAuthority: 'ICAR-CIBRC Insecticide Board Advisory',
          state: 'All India',
        },
        {
          crop: 'Rice',
          pestOrDisease: 'Blast (Magnaporthe oryzae)',
          symptoms: ['Spindle-shaped lesions with grayish centers on leaves', 'Neck rot on panicles'],
          approvedPesticide: 'Tricyclazole 75% WP',
          activeIngredient: 'Tricyclazole',
          dosage: '0.6 gram per liter of water (120g per acre in 200L water)',
          applicationMethod: 'Spray at initial appearance of leaf spots or before panicle emergence.',
          safetyPrecaution: 'Use protective gear. Ensure clean spray equipment. Store away from food items and animal feed.',
          waitingPeriodDays: 14,
          sourceAuthority: 'ICAR-NRRI (National Rice Research Institute)',
          state: 'All India',
        },
        {
          crop: 'Rice',
          pestOrDisease: 'Brown Planthopper (BPH)',
          symptoms: ['Hopperburn patches of dried yellow brown plants', 'Clusters of insects at tiller base'],
          approvedPesticide: 'Pymetrozine 50% WDG',
          activeIngredient: 'Pymetrozine',
          dosage: '0.6 gram per liter of water (120g per acre)',
          applicationMethod: 'Direct spray towards the base of rice plants.',
          safetyPrecaution: 'Do not spray when honey bees are actively foraging.',
          waitingPeriodDays: 19,
          sourceAuthority: 'ICAR-NRRI & Directorate of Rice Development',
          state: 'All India',
        },
        {
          crop: 'Onion',
          pestOrDisease: 'Thrips (Thrips tabaci)',
          symptoms: ['Silvery streaks or patches on leaves', 'Curling leaf tips'],
          approvedPesticide: 'Fipronil 5% SC',
          activeIngredient: 'Fipronil',
          dosage: '1.5 ml per liter of water (300 ml per acre)',
          applicationMethod: 'Foliar spray with sticker/spreader agent.',
          safetyPrecaution: 'Highly toxic to aquatic organisms. Prevent runoff into ponds or streams.',
          waitingPeriodDays: 7,
          sourceAuthority: 'ICAR-DOGR (Directorate of Onion and Garlic Research)',
          state: 'Maharashtra',
        },
        {
          crop: 'Cotton',
          pestOrDisease: 'Pink Bollworm',
          symptoms: ['Rosetted flowers', 'Holes in bolls with stain on lint'],
          approvedPesticide: 'Emamectin Benzoate 5% SG',
          activeIngredient: 'Emamectin Benzoate',
          dosage: '0.4 gram per liter of water (80-100g per acre)',
          applicationMethod: 'Spray at ETL threshold (8 moths per trap/night).',
          safetyPrecaution: 'Always wear mask and rubber gloves during handling.',
          waitingPeriodDays: 10,
          sourceAuthority: 'ICAR-CICR (Central Institute for Cotton Research)',
          state: 'All India',
        }
      ]);
      console.log('[Seed] ICAR Pesticide advisories seeded successfully.');
    }

    // Always clear & re-seed scheme dataset to ensure full rich fields
    await GovernmentScheme.deleteMany({});
    console.log('[Seed] Seeding verified Central & State Government Schemes dataset...');
    await GovernmentScheme.insertMany([
      {
        schemeName: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        code: 'PM-KISAN',
        governmentType: 'Central',
        state: 'All India',
        category: 'credit',
        cropType: 'All Crops',
        farmerCategory: 'all',
        shortDescription: 'Direct income support of ₹6,000 per year paid in 3 equal installments of ₹2,000 directly to farmer bank accounts via Direct Benefit Transfer (DBT).',
        eligibility: 'All landholding farmer families with cultivable land holdings in their name across all States and Union Territories (subject to exclusion criteria).',
        benefits: 'Direct annual cash support of ₹6,000 per family. Zero intermediary involvement, 100% central government funding.',
        applicationProcess: 'Register online at the official pmkisan.gov.in portal using Aadhaar & mobile OTP, or visit your nearest Common Service Centre (CSC) / Agriculture Office.',
        documentsRequired: ['Aadhaar Card', 'Land Ownership Record (RTC/Pahani/7-12)', 'Active Bank Account Passbook', 'Mobile Number linked with Aadhaar'],
        department: 'Ministry of Agriculture & Farmers Welfare, GOI',
        deadline: 'Ongoing Direct Sourcing Active',
        status: 'active',
        officialUrl: 'https://pmkisan.gov.in',
        pdfUrl: 'https://pmkisan.gov.in/Documents/PMKISAN_Operational_Guidelines.pdf',
        keywords: ['pm kisan', '6000', 'dbt', 'cash support', 'kisan samman', 'income support'],
        faqs: [
          { question: 'Who is eligible for PM-KISAN?', answer: 'All landholding farmer families with cultivable land in their name are eligible. Institutional landholders and high-income earners are excluded.' },
          { question: 'How is the amount transferred?', answer: 'The amount of ₹6,000 per year is paid directly into verified bank accounts in three equal installments of ₹2,000 every 4 months.' }
        ]
      },
      {
        schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        code: 'PMFBY',
        governmentType: 'Central',
        state: 'All India',
        category: 'insurance',
        cropType: 'All Crops',
        farmerCategory: 'all',
        shortDescription: 'Comprehensive crop insurance against loss of yield caused by natural risks from pre-sowing to post-harvest stages with minimal premium rates.',
        eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops in notified areas are eligible for coverage.',
        benefits: 'Complete financial compensation for crop damages caused by drought, flood, pests, and localized calamities. Farmer premium capped at 2% for Kharif, 1.5% for Rabi, and 5% for Commercial/Horticultural crops.',
        applicationProcess: 'Apply online through pmfby.gov.in, via Crop Insurance Mobile App, or visit designated bank branches and Common Service Centres (CSCs) before cut-off date.',
        documentsRequired: ['Aadhaar Card', 'Land Record (RTC/Pahani)', 'Sowing Certificate / Declaration', 'Bank Account Passbook'],
        department: 'Ministry of Agriculture & Farmers Welfare, GOI',
        deadline: 'Cutoff: 31st August 2026 for Kharif',
        status: 'active',
        officialUrl: 'https://pmfby.gov.in',
        pdfUrl: 'https://pmfby.gov.in/pdf/PMFBY_Revised_Guidelines.pdf',
        keywords: ['crop insurance', 'fasal bima', 'drought loss', 'flood relief', 'pmfby', 'yield loss'],
        faqs: [
          { question: 'What is the premium rate for food grains?', answer: 'Farmers pay only 2% of the sum insured for Kharif crops and 1.5% for Rabi crops. The balance premium is subsidized by Government.' },
          { question: 'How to claim crop loss due to localized calamity?', answer: 'Notify the bank or insurance company within 72 hours of localized damage (like hailstorm or inundation) via the Crop Insurance App.' }
        ]
      },
      {
        schemeName: 'Kisan Credit Card (KCC) Scheme',
        code: 'KCC',
        governmentType: 'Central',
        state: 'All India',
        category: 'credit',
        cropType: 'All Crops',
        farmerCategory: 'all',
        shortDescription: 'Subsidized short-term crop loans up to ₹3 Lakh at an effective interest rate of 4% per annum with prompt repayment incentives.',
        eligibility: 'All individual farmers, joint borrowers, tenant farmers, Self Help Groups (SHGs), and Joint Liability Groups (JLGs).',
        benefits: 'Single revolving credit card for crop cultivation expenses, post-harvest costs, and farm maintenance. Interest rate reduced to 4% upon timely repayment.',
        applicationProcess: 'Download single-page KCC application form from myscheme.gov.in or visit any Commercial Bank, RRB, or Cooperative Bank.',
        documentsRequired: ['Duly Filled KCC Application Form', 'Aadhaar / Voter ID Card', 'Land Revenue Records', 'Passport Photo'],
        department: 'Department of Agriculture & Reserve Bank of India (RBI)',
        deadline: 'Ongoing Year-Round Sourcing',
        status: 'active',
        officialUrl: 'https://myscheme.gov.in/schemes/kcc',
        pdfUrl: 'https://www.nabard.org/pdf/KCC_Guidelines.pdf',
        keywords: ['kcc', 'loan', 'credit card', 'interest subsidy', '4 percent', 'crop loan'],
        faqs: [
          { question: 'What is the maximum limit for collateral-free loan?', answer: 'Farmers can get collateral-free KCC crop loans up to ₹1.60 Lakh (extended to ₹3 Lakh for animal husbandry/dairying).' }
        ]
      },
      {
        schemeName: 'PM Krishi Sinchayee Yojana (Micro Irrigation Subsidy)',
        code: 'PMKSY-MI',
        governmentType: 'Central',
        state: 'All India',
        category: 'irrigation',
        cropType: 'Horticulture & Field Crops',
        farmerCategory: 'small',
        shortDescription: 'Up to 90% subsidy on installation of Drip and Sprinkler irrigation systems under Per Drop More Crop (PDMC) initiative.',
        eligibility: 'Small and marginal farmers owning cultivable land with an assured water source (borewell/canal/pond).',
        benefits: '55% Central Subsidy + Top-up State Subsidy (up to 90% total subsidy). Saves 40-50% water and increases crop yield by 20-30%.',
        applicationProcess: 'Submit online application through PMKSY / State Agriculture Department portal or contact Assistant Director of Agriculture at Taluk level.',
        documentsRequired: ['RTC / Land Pahani', 'Aadhaar Card', 'Bank Account Passbook', 'Water Source Proof / Electricity Connection'],
        department: 'Department of Agriculture & Farmers Welfare, GOI',
        deadline: '31st December 2026',
        status: 'active',
        officialUrl: 'https://pmksy.gov.in',
        pdfUrl: 'https://pmksy.gov.in/pdf/PDMC_Guidelines.pdf',
        keywords: ['drip irrigation', 'sprinkler', 'water subsidy', 'pmksy', 'per drop more crop', 'irrigation'],
        faqs: [
          { question: 'What is the subsidy percentage for small farmers?', answer: 'Small and marginal farmers receive up to 90% subsidy on micro-irrigation unit installations.' }
        ]
      },
      {
        schemeName: 'PM-KUSUM Solar Agriculture Pump Scheme',
        code: 'PM-KUSUM',
        governmentType: 'Central',
        state: 'All India',
        category: 'solar',
        cropType: 'All Crops',
        farmerCategory: 'all',
        shortDescription: 'Up to 90% subsidy for setting up standalone off-grid solar agriculture pumps and solarization of grid-connected pumps.',
        eligibility: 'Individual farmers, farmer groups, cooperatives, and Panchayats having agricultural land requiring irrigation pumps.',
        benefits: 'Central Govt provides 30% subsidy, State Govt provides 30% subsidy, and Bank loan covers 30%. Farmers pay only 10% of total cost.',
        applicationProcess: 'Apply online through State Renewable Energy Agency portal (e.g. KREDL in Karnataka, MEDA in Maharashtra) or pmkusum.mnre.gov.in.',
        documentsRequired: ['Land Ownership Record', 'Aadhaar Card', 'Bank Passbook', 'Electricity Connection Details (if grid-connected)'],
        department: 'Ministry of New & Renewable Energy (MNRE), GOI',
        deadline: 'Active Sourcing Batch 2026',
        status: 'active',
        officialUrl: 'https://pmkusum.mnre.gov.in',
        pdfUrl: 'https://pmkusum.mnre.gov.in/pdf/KUSUM_Guidelines.pdf',
        keywords: ['kusum', 'solar pump', 'free electricity', 'solar irrigation', 'mnre', 'pump subsidy'],
        faqs: [
          { question: 'Can farmers sell surplus solar power?', answer: 'Yes! Under Component-A & C, farmers can sell excess solar power generated back to DISCOMs for additional regular income.' }
        ]
      },
      {
        schemeName: 'Sub-Mission on Agricultural Mechanization (SMAM)',
        code: 'SMAM',
        governmentType: 'Central',
        state: 'All India',
        category: 'machinery',
        cropType: 'All Crops',
        farmerCategory: 'small',
        shortDescription: '40% to 50% financial subsidy for purchasing modern farm equipment like tractors, rotavators, power tillers, and sprayers.',
        eligibility: 'Small, marginal, SC/ST, and women farmers seeking purchase of certified agricultural machinery.',
        benefits: 'Direct financial subsidy ranging from ₹50,000 up to ₹2.5 Lakh on approved farm machinery models.',
        applicationProcess: 'Register on agrimachinery.nic.in portal, select certified machinery manufacturer, and submit subsidy application online.',
        documentsRequired: ['Aadhaar Card', 'Land Record (RTC/Pahani)', 'Caste Certificate (if applicable)', 'Bank Passbook'],
        department: 'Ministry of Agriculture & Farmers Welfare, GOI',
        deadline: 'Rolling Applications 2026',
        status: 'active',
        officialUrl: 'https://agrimachinery.nic.in',
        pdfUrl: 'https://agrimachinery.nic.in/pdf/SMAM_Guidelines.pdf',
        keywords: ['tractor subsidy', 'rotavator', 'farm equipment', 'machinery', 'smam', 'power tiller'],
        faqs: [
          { question: 'How is the subsidy amount disbursed?', answer: 'The subsidy amount is directly credited to the farmer bank account via DBT after physical verification of the purchased machine.' }
        ]
      },
      {
        schemeName: 'Karnataka Raitha Siri Scheme (Millet Subsidy)',
        code: 'KA-RAITHASIRI',
        governmentType: 'State',
        state: 'Karnataka',
        category: 'subsidy',
        cropType: 'Millets (Siri Dhanya)',
        farmerCategory: 'all',
        shortDescription: 'Financial assistance of ₹10,000 per hectare directly credited to millet farmers cultivating Siri Dhanya crops in Karnataka.',
        eligibility: 'Farmers cultivating notified millet crops (Foxtail, Little, Kodo, Barnyard, Browntop Millets) in Karnataka.',
        benefits: '₹10,000 per hectare incentive deposited via Direct Benefit Transfer (DBT) into farmer bank account.',
        applicationProcess: 'Register crop sowing details on Fruit Portal (fruits.karnataka.gov.in) and submit application at Raitha Samparka Kendra (RSK).',
        documentsRequired: ['Fruits ID / Aadhaar', 'Land Pahani / RTC showing Millet crop', 'Bank Passbook'],
        department: 'Department of Agriculture, Government of Karnataka',
        deadline: 'Active Kharif & Rabi Season',
        status: 'active',
        officialUrl: 'https://fruits.karnataka.gov.in',
        pdfUrl: 'https://raitamitra.karnataka.gov.in/pdf/RaithaSiri.pdf',
        keywords: ['raitha siri', 'karnataka', 'millet incentive', '10000 per hectare', 'siri dhanya', 'fruits portal'],
        faqs: [
          { question: 'Which crops are covered under Raitha Siri?', answer: 'Covered crops include Ragi, Navane, Same, Haraka, Sajje, and Browntop Millets.' }
        ]
      },
      {
        schemeName: 'Karnataka Krishi Bhagya Scheme (Farm Ponds & Polyhouse)',
        code: 'KA-KRISHIBHAGYA',
        governmentType: 'State',
        state: 'Karnataka',
        category: 'irrigation',
        cropType: 'Dryland & Rainfed Crops',
        farmerCategory: 'small',
        shortDescription: 'Up to 80-90% subsidy for constructing Farm Ponds (Krishi Houda), installing polythene lining, diesel pump sets, and shade net houses.',
        eligibility: 'Rainfed agricultural farmers in dryland districts of Karnataka.',
        benefits: 'Financial assistance for rain water harvesting ponds ensuring protective irrigation during dry spells.',
        applicationProcess: 'Apply through Raitha Samparka Kendra (RSK) or online via Department of Agriculture Karnataka portal.',
        documentsRequired: ['RTC / Pahani Record', 'Aadhaar Card', 'Fruits Registration Number', 'Bank Account'],
        department: 'Department of Agriculture, Govt. of Karnataka',
        deadline: 'Active District Sourcing',
        status: 'active',
        officialUrl: 'https://raitamitra.karnataka.gov.in',
        pdfUrl: 'https://raitamitra.karnataka.gov.in/pdf/KrishiBhagya.pdf',
        keywords: ['krishi bhagya', 'farm pond', 'krishi houda', 'karnataka subsidy', 'polyhouse', 'shade net'],
        faqs: [
          { question: 'What is the subsidy for general category farmers?', answer: 'General category farmers receive 80% subsidy, while SC/ST farmers receive 90% subsidy.' }
        ]
      },
      {
        schemeName: 'Namo Shetkari Mahasanman Nidhi Yojana',
        code: 'MH-NAMOSHETKARI',
        governmentType: 'State',
        state: 'Maharashtra',
        category: 'credit',
        cropType: 'All Crops',
        farmerCategory: 'all',
        shortDescription: 'Additional state cash incentive of ₹6,000 per year provided by Maharashtra Govt, over and above PM-KISAN, making total ₹12,000/yr.',
        eligibility: 'All farmers in Maharashtra who are active beneficiaries of PM-KISAN Scheme.',
        benefits: 'Extra ₹6,000/year transferred in 3 equal installments of ₹2,000 directly via DBT.',
        applicationProcess: 'Automatic enrollment for all PM-KISAN approved landholding farmers in Maharashtra.',
        documentsRequired: ['PM-KISAN Registration ID', 'Aadhaar Card', 'Land Record 7/12', 'Bank Account'],
        department: 'Department of Agriculture, Government of Maharashtra',
        deadline: 'Ongoing Active DBT',
        status: 'active',
        officialUrl: 'https://krishi.maharashtra.gov.in',
        pdfUrl: 'https://krishi.maharashtra.gov.in/pdf/NamoShetkari.pdf',
        keywords: ['namo shetkari', 'maharashtra', '12000 per year', 'dbt', 'state income support'],
        faqs: [
          { question: 'Do I need to apply separately for Namo Shetkari?', answer: 'No separate application is required if your Aadhaar & land records are verified on PM-KISAN portal.' }
        ]
      }
    ]);
    console.log('[Seed] Verified Central & State Government Schemes dataset seeded successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding agricultural data:', error.message);
  }
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Zap, Bot, TrendingUp, ArrowRight, 
  Smartphone, Shield, Upload, Handshake, Wallet, ArrowUpRight, 
  ArrowDownRight, ChevronRight 
} from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import api from '../api/axios';

const FALLBACK_MARKET_DATA = [
  { commodity: 'Tomato (Hybrid)', mandi: 'Bengaluru (APMC)', modal_price: 2450, trend: '+4.2%', isUp: true },
  { commodity: 'Onion (Red)', mandi: 'Tumkur Mandi', modal_price: 3180, trend: '+2.8%', isUp: true },
  { commodity: 'Ragi (Finger Millet)', mandi: 'Ramanagara APMC', modal_price: 3600, trend: '-1.1%', isUp: false },
  { commodity: 'Potato (Jyoti)', mandi: 'Hassan Mandi', modal_price: 1850, trend: '+3.5%', isUp: true }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [livePrices, setLivePrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data } = await api.get('/market-prices');
        if (data && data.length > 0) {
          const enriched = data.slice(0, 4).map((item, idx) => ({
            ...item,
            trend: idx % 2 === 0 ? '+3.4%' : '+1.8%',
            isUp: true
          }));
          setLivePrices(enriched);
        } else {
          setLivePrices(FALLBACK_MARKET_DATA);
        }
      } catch (err) {
        console.error('Failed to fetch market prices', err);
        setLivePrices(FALLBACK_MARKET_DATA);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const displayPrices = livePrices.length > 0 ? livePrices : FALLBACK_MARKET_DATA;

  return (
    <div className="min-h-screen bg-green-50/30 text-slate-800 font-sans overflow-x-hidden selection:bg-green-200">

      {/* Dynamic Background Mesh Gradient */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-green-300/30 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-amber-300/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-300/20 blur-[90px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navbar (Sticky) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-green-500/30 group-hover:rotate-12 transition-transform">
              🌾
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-800">
                Kisan<span className="text-green-600">Bazaar</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <main>
        {/* 1. HERO SECTION */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            <motion.div
              initial="hidden" animate="visible" variants={staggerContainer}
              className="flex flex-col gap-6"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-green-100/80 text-green-800 rounded-full w-fit border border-green-200 shadow-sm font-medium text-sm">
                🚜 {t('landing.heroTaglineKn') || "ರೈತರಿಂದ ನೇರವಾಗಿ ನಿಮಗೆ"}
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-tight text-slate-900 tracking-tight">
                Farm Fresh,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-amber-500">
                  Direct to You.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg lg:text-xl text-slate-600 max-w-lg leading-relaxed">
                {t('landing.heroSubtitle')}
              </motion.p>

              <motion.p variants={fadeUp} className="text-sm lg:text-base text-slate-500 max-w-lg font-medium">
                {t('landing.heroSubtitle2')}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mt-4">
                <button
                  onClick={() => navigate('/login/farmer')}
                  className="group flex-1 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl hover:shadow-xl hover:shadow-green-600/30 transition-all hover:-translate-y-1 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧑‍🌾</span>
                    <div className="text-left">
                      <div className="font-bold text-lg">{t('landing.imFarmer')}</div>
                      <div className="text-xs opacity-80 font-medium">List crops & earn</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </button>

                <button
                  onClick={() => navigate('/login/buyer')}
                  className="group flex-1 flex items-center justify-between px-6 py-4 bg-white text-slate-800 border-2 border-amber-200 rounded-2xl hover:border-amber-400 hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛒</span>
                    <div className="text-left">
                      <div className="font-bold text-lg">{t('landing.imBuyer')}</div>
                      <div className="text-xs text-slate-500 font-medium">Find bulk deals</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-500 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block group"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500 to-amber-400 rounded-[2.5rem] rotate-3 opacity-25 blur-xl group-hover:opacity-40 group-hover:rotate-6 transition-all duration-500"></div>
              <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 p-3 rounded-[2.5rem] shadow-2xl overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
                <img
                  src="/farmer-hero.png"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=1000&q=80";
                  }}
                  alt="KisanBazaar Empowering Indian Farmers"
                  className="w-full h-[460px] object-cover rounded-[2rem] shadow-md group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. FEATURE HIGHLIGHTS */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute top-1/2 left-10 w-96 h-96 bg-green-200/30 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-200/30 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp} className="text-center mb-16"
            >
              <span className="text-xs font-bold text-green-700 uppercase tracking-widest bg-green-100 px-3.5 py-1.5 rounded-full border border-green-200">
                Next-Gen Agri Tech
              </span>
              <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mt-4 mb-4 tracking-tight">
                Supercharging Agriculture
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg font-medium">
                Powerful tools designed specifically for the needs of Indian farmers and bulk buyers.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Shield className="w-7 h-7" />}
                title={t('landing.featVerification')}
                desc={t('landing.featVerificationDesc')}
                gradient="from-green-500 to-emerald-600"
                topAccent="bg-gradient-to-r from-green-500 to-emerald-400"
                shadowColor="hover:shadow-green-500/15 hover:border-green-300"
                delay={0}
                path="/login/farmer"
              />
              <FeatureCard
                icon={<Zap className="w-7 h-7" />}
                title={t('landing.featCropListing')}
                desc={t('landing.featCropListingDesc')}
                gradient="from-amber-400 to-amber-600"
                topAccent="bg-gradient-to-r from-amber-400 to-amber-500"
                shadowColor="hover:shadow-amber-500/15 hover:border-amber-300"
                delay={0.1}
                path="/register/farmer"
              />
              <FeatureCard
                icon={<Bot className="w-7 h-7" />}
                title={t('landing.featAssistant')}
                desc={t('landing.featAssistantDesc')}
                gradient="from-sky-400 to-blue-600"
                topAccent="bg-gradient-to-r from-sky-400 to-blue-500"
                shadowColor="hover:shadow-sky-500/15 hover:border-sky-300"
                delay={0.2}
                path="/chat-test"
              />
              <FeatureCard
                icon={<Smartphone className="w-7 h-7" />}
                title={t('landing.featContact')}
                desc={t('landing.featContactDesc')}
                gradient="from-rose-400 to-pink-600"
                topAccent="bg-gradient-to-r from-rose-400 to-pink-500"
                shadowColor="hover:shadow-rose-500/15 hover:border-rose-300"
                delay={0.3}
                path="/register/buyer"
              />
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp} className="text-center mb-20"
            >
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200">
                Simple 4-Step Process
              </span>
              <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mt-4 mb-4 tracking-tight">
                {t('landing.howItWorks')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-8 text-center relative">
               <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-1 bg-slate-100 -z-10 rounded-full overflow-hidden">
                 <motion.div
                   initial={{ scaleX: 0 }}
                   whileInView={{ scaleX: 1 }}
                   viewport={{ once: true }}
                   transition={{ duration: 1.2, ease: "easeInOut" }}
                   className="h-full bg-gradient-to-r from-green-500 via-amber-400 to-emerald-600 origin-left"
                 />
               </div>

               <Step
                 number="1"
                 icon={<Upload className="w-6 h-6 text-white" />}
                 title={t('landing.step1Title')}
                 desc={t('landing.step1Desc')}
                 delay={0}
               />
               <Step
                 number="2"
                 icon={<ShieldCheck className="w-6 h-6 text-white" />}
                 title={t('landing.step2Title')}
                 desc={t('landing.step2Desc')}
                 delay={0.15}
               />
               <Step
                 number="3"
                 icon={<Handshake className="w-6 h-6 text-white" />}
                 title={t('landing.step3Title')}
                 desc={t('landing.step3Desc')}
                 delay={0.3}
               />
               <Step
                 number="4"
                 icon={<Wallet className="w-6 h-6 text-white" />}
                 title={t('landing.step4Title')}
                 desc={t('landing.step4Desc')}
                 delay={0.45}
               />
            </div>
          </div>
        </section>

        {/* 6. AUDIENCE SPLIT */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
             <div className="bg-green-600 rounded-[2rem] p-10 lg:p-14 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                <h3 className="text-3xl font-extrabold mb-4">{t('landing.farmersSectionTitle')}</h3>
                <p className="text-green-100 text-lg mb-8 max-w-md">{t('landing.farmersSectionDesc')}</p>
                <button onClick={() => navigate('/login/farmer')} className="bg-white text-green-700 font-bold px-8 py-3 rounded-xl hover:shadow-xl hover:bg-green-50 transition-all hover:-translate-y-1 active:scale-95">
                   Join as Farmer
                </button>
             </div>

             <div className="bg-amber-100 rounded-[2rem] p-10 lg:p-14 text-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/60 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                <h3 className="text-3xl font-extrabold mb-4">{t('landing.buyersSectionTitle')}</h3>
                <p className="text-amber-800/80 text-lg mb-8 max-w-md">{t('landing.buyersSectionDesc')}</p>
                <button onClick={() => navigate('/login/buyer')} className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:shadow-xl hover:bg-slate-800 transition-all hover:-translate-y-1 active:scale-95">
                   Start Buying
                </button>
             </div>
          </div>
        </section>
      </main>

      {/* 7. FOOTER & CTA */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
           <h2 className="text-4xl font-extrabold text-slate-900 mb-6">{t('landing.ctaFooterTitle')}</h2>
           <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">{t('landing.ctaFooterDesc')}</p>
           <button onClick={() => navigate('/login/farmer')} className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-10 py-4 rounded-full shadow-xl shadow-green-600/30 transition-all hover:-translate-y-1 active:scale-95">
             Get Started Now
           </button>
        </div>
        <div className="border-t border-slate-200 py-6 text-center text-slate-500 text-sm font-medium">
          © {new Date().getFullYear()} KisanBazaar 🌾 — Empowering Bharat's Farmers
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, gradient, topAccent, shadowColor, delay, path }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      onClick={() => navigate(path)}
      className={`relative p-8 rounded-3xl bg-white border border-slate-100 shadow-md ${shadowColor} transition-all duration-300 cursor-pointer group flex flex-col justify-between overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${topAccent}`}></div>
      <div>
        <div className={`mb-6 w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-green-700 transition-colors">{title}</h3>
        <p className="text-slate-500 leading-relaxed font-medium text-sm">{desc}</p>
      </div>
      <div className="text-xs font-bold text-slate-400 group-hover:text-green-600 flex items-center gap-1.5 mt-6 transition-all duration-300">
        <span>Learn more</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}

function Step({ number, icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center group cursor-default"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white flex flex-col items-center justify-center shadow-lg shadow-green-600/30 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
          <div className="mb-0.5">{icon}</div>
          <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full">Step {number}</span>
        </div>
      </div>
      <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-green-700 transition-colors">{title}</h4>
      <p className="text-slate-500 font-medium text-sm max-w-xs">{desc}</p>
    </motion.div>
  );
}

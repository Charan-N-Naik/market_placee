import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="landing-root">
      {/* ── Organic background blobs ── */}
      <div className="landing-blobs" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <div className="brand-icon">🌾</div>
          <div>
            <span className="brand-name">Kisan<span className="brand-accent">Bazaar</span></span>
            <div className="brand-underline" />
          </div>
        </div>
        <div className="nav-right">
          <LanguageToggle />
          <button className="nav-login-btn" onClick={() => navigate('/login/farmer')}>
            {t('login') || 'Login'}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="landing-main">
        {/* Left: Text */}
        <section className="hero-left">
          {/* Kannada pill */}
          <div className="hero-kannada-pill">
            <span>🚜</span>
            <span className="kannada-text">ರೈತರಿಂದ ನೇರವಾಗಿ ನಿಮಗೆ</span>
          </div>

          <h1 className="hero-headline">
            <span className="headline-main">Farm Fresh,</span>
            <br />
            <span className="headline-accent">Direct to You.</span>
          </h1>

          <p className="hero-sub">
            {t('heroSubtitle') || "India's trusted marketplace connecting farmers with bulk buyers — fair prices, zero middlemen."}
          </p>

          <p className="hero-sub2">
            {t('heroSubtitle2') || "Empowering Bharat's farmers with simple tools and direct buyer connections. 🌱"}
          </p>

          {/* CTA Buttons */}
          <div className="hero-ctas">
            <button className="cta-farmer" onClick={() => navigate('/login/farmer')}>
              <span className="cta-icon">🧑‍🌾</span>
              <span>
                <span className="cta-label">{t('imFarmer') || "I'm a Farmer"}</span>
                <span className="cta-hint">List your crops & earn more</span>
              </span>
              <span className="cta-arrow">→</span>
            </button>

            <button className="cta-buyer" onClick={() => navigate('/login/buyer')}>
              <span className="cta-icon">🛒</span>
              <span>
                <span className="cta-label">{t('imBuyer') || "I'm a Buyer"}</span>
                <span className="cta-hint">Fresh produce, bulk deals</span>
              </span>
              <span className="cta-arrow">→</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="trust-strip">
            <span className="trust-item">{t('trustStrip1') || '✅ No middlemen'}</span>
            <span className="trust-divider" />
            <span className="trust-item">{t('trustStrip2') || '📞 Direct contact'}</span>
            <span className="trust-divider" />
            <span className="trust-item">{t('trustStrip3') || '🌾 Verified crops'}</span>
          </div>
        </section>

        {/* Right: Feature Cards */}
        <section className="hero-right">
          <FeatureCard
            emoji="🛡️"
            title={t('featVerification') || "AI Photo Verification"}
            desc={t('featVerificationDesc') || "Every crop photo verified for authenticity before going live."}
            color="green"
            delay="0ms"
          />
          <FeatureCard
            emoji="⚡"
            title={t('featCropListing') || "Easy Crop Listing"}
            desc={t('featCropListingDesc') || "Upload photos & details of your crops in minutes."}
            color="amber"
            delay="80ms"
          />
          <FeatureCard
            emoji="🤖"
            title={t('featAssistant') || "AI Farming Assistant"}
            desc={t('featAssistantDesc') || "Get expert advice on pricing, pests & government schemes."}
            color="sky"
            delay="160ms"
          />
          <FeatureCard
            emoji="🤝"
            title={t('featContact') || "Direct Contact"}
            desc={t('featContactDesc') || "Connect with buyers & farmers via phone & WhatsApp."}
            color="rose"
            delay="240ms"
          />
        </section>
      </main>

      {/* ── Scroll ribbon ── */}
      <div className="scroll-ribbon-container group">
        <div className="scroll-ribbon-track">
          {['ribbonFreshCrops', 'ribbonVegetables', 'ribbonTomatoes', 'ribbonCorn', 'ribbonOnions', 'ribbonRagi', 'ribbonCarrots', 'ribbonBrinjal', 'ribbonChillies', 'ribbonGroundnuts'].map((key, i) => (
            <span key={i} className="ribbon-item">{t(key)}</span>
          ))}
          {/* duplicate for seamless loop */}
          {['ribbonFreshCrops', 'ribbonVegetables', 'ribbonTomatoes', 'ribbonCorn', 'ribbonOnions', 'ribbonRagi', 'ribbonCarrots', 'ribbonBrinjal', 'ribbonChillies', 'ribbonGroundnuts'].map((key, i) => (
            <span key={`d-${i}`} className="ribbon-item">{t(key)}</span>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>© 2026 KisanBazaar 🌾 — Empowering Bharat's Farmers</span>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>

      <style>{landingCSS}</style>
    </div>
  );
}

function FeatureCard({ emoji, title, desc, color, delay }) {
  const palettes = {
    green: { bg: '#f0fdf4', border: '#bbf7d0', tag: '#16a34a', tagBg: '#dcfce7' },
    amber: { bg: '#fffbeb', border: '#fde68a', tag: '#d97706', tagBg: '#fef3c7' },
    sky:   { bg: '#f0f9ff', border: '#bae6fd', tag: '#0284c7', tagBg: '#e0f2fe' },
    rose:  { bg: '#fff1f2', border: '#fecdd3', tag: '#e11d48', tagBg: '#ffe4e6' },
  };
  const p = palettes[color];
  return (
    <div
      className="feature-card animate-fade-in"
      style={{ background: p.bg, borderColor: p.border, animationDelay: delay }}
    >
      <span className="feature-emoji">{emoji}</span>
      <div className="feature-body">
        <h3 className="feature-title">{title}</h3>
        <p className="feature-desc">{desc}</p>
      </div>
      <span className="feature-tag" style={{ color: p.tag, background: p.tagBg }}>Free ✓</span>
    </div>
  );
}

/* ─── All scoped CSS ─────────────────────────────────────────────────── */
const landingCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  .landing-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', sans-serif;
    background: #fffdf6;
    background-image:
      radial-gradient(ellipse 80% 60% at 90% -10%, rgba(134,239,172,0.25) 0%, transparent 55%),
      radial-gradient(ellipse 70% 50% at -10% 80%, rgba(253,230,138,0.30) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,237,213,0.20) 0%, transparent 60%);
    overflow-x: hidden;
    position: relative;
  }

  /* ── Blobs ── */
  .landing-blobs { position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.55;
    animation: blobPulse 7s ease-in-out infinite;
  }
  .blob-1 { width:560px; height:560px; top:-12%; right:-8%;  background: radial-gradient(circle, #86efac, #6ee7b7); animation-delay:0s; }
  .blob-2 { width:480px; height:480px; bottom:5%;  left:-10%; background: radial-gradient(circle, #fde68a, #fbbf24); animation-delay:2.5s; }
  .blob-3 { width:320px; height:320px; top:45%;  right:18%; background: radial-gradient(circle, #fca5a5, #fb923c); animation-delay:5s; }
  .blob-4 { width:260px; height:260px; top:20%;  left:30%;  background: radial-gradient(circle, #a7f3d0, #34d399); animation-delay:3.5s; }
  @keyframes blobPulse {
    0%,100% { transform: scale(1) translate(0,0); }
    33% { transform: scale(1.08) translate(12px,-10px); }
    66% { transform: scale(0.95) translate(-8px, 14px); }
  }

  /* ── Navbar ── */
  .landing-nav {
    position: relative; z-index: 50;
    padding: 1.5rem 5% ;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-brand {
    display: flex; align-items: center; gap: 1rem;
    cursor: pointer;
  }
  .brand-icon {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem;
    box-shadow: 0 6px 20px rgba(34,197,94,0.35);
    transition: transform 0.4s;
  }
  .nav-brand:hover .brand-icon { transform: rotate(10deg) scale(1.05); }
  .brand-name {
    font-family: 'Baloo 2', cursive;
    font-size: 1.9rem; font-weight: 800;
    color: #14532d; letter-spacing: -0.5px;
  }
  .brand-accent { color: #16a34a; }
  .brand-underline {
    height: 3px; width: 0;
    background: linear-gradient(90deg, #22c55e, #f59e0b);
    border-radius: 99px; margin-top: 2px;
    transition: width 0.5s;
  }
  .nav-brand:hover .brand-underline { width: 100%; }
  .nav-right { display: flex; align-items: center; gap: 1.5rem; }
  .nav-login-btn {
    padding: 0.6rem 1.6rem;
    background: #14532d; color: #fff;
    border: none; border-radius: 99px;
    font-weight: 700; font-size: 0.82rem;
    letter-spacing: 0.08em; text-transform: uppercase;
    cursor: pointer; transition: background 0.25s, transform 0.2s;
  }
  .nav-login-btn:hover { background: #166534; transform: translateY(-1px); }

  /* ── Main layout ── */
  .landing-main {
    position: relative; z-index: 10;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    padding: 3rem 5% 5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
  @media (max-width: 900px) {
    .landing-main { grid-template-columns: 1fr; padding: 2rem 5% 4rem; gap: 3rem; }
  }

  /* ── Hero Left ── */
  .hero-left { display: flex; flex-direction: column; gap: 2rem; }

  .hero-kannada-pill {
    display: inline-flex; align-items: center; gap: 0.7rem;
    padding: 0.5rem 1.2rem;
    background: linear-gradient(135deg, #dcfce7, #fef9c3);
    border: 1.5px solid #86efac;
    border-radius: 99px;
    width: fit-content;
    box-shadow: 0 2px 12px rgba(134,239,172,0.3);
  }
  .kannada-text {
    font-family: 'Baloo 2', cursive;
    font-size: 1rem; font-weight: 700;
    color: #15803d;
    letter-spacing: 0.01em;
  }

  .hero-headline {
    font-family: 'Baloo 2', cursive;
    line-height: 1.08;
    margin: 0;
  }
  .headline-main {
    font-size: clamp(3rem, 6vw, 5.5rem);
    font-weight: 800;
    color: #1c1917;
    display: block;
  }
  .headline-accent {
    font-size: clamp(2.8rem, 5.8vw, 5.2rem);
    font-weight: 800;
    background: linear-gradient(135deg, #16a34a 0%, #22c55e 40%, #f59e0b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: block;
  }

  .hero-sub {
    font-size: 1.15rem;
    color: #44403c;
    line-height: 1.7;
    max-width: 500px;
    margin: 0;
  }
  .hero-sub strong { color: #15803d; }
  .hero-sub2 {
    font-size: 1rem;
    color: #78716c;
    line-height: 1.6;
    margin: -0.8rem 0 0;
    max-width: 480px;
  }

  /* ── CTA Buttons ── */
  .hero-ctas { display: flex; flex-direction: column; gap: 1rem; max-width: 440px; }
  @media (min-width: 480px) { .hero-ctas { flex-direction: row; max-width: 560px; } }

  .cta-farmer, .cta-buyer {
    flex: 1;
    display: flex; align-items: center; gap: 0.9rem;
    padding: 1rem 1.4rem;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: transform 0.25s, box-shadow 0.25s;
    position: relative; overflow: hidden;
  }
  .cta-farmer {
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: #fff;
    box-shadow: 0 10px 32px rgba(22,163,74,0.35);
  }
  .cta-farmer:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(22,163,74,0.45); }
  .cta-buyer {
    background: #fff;
    color: #1c1917;
    border: 2px solid #fde68a;
    box-shadow: 0 8px 24px rgba(251,191,36,0.2);
  }
  .cta-buyer:hover { transform: translateY(-3px); border-color: #fbbf24; box-shadow: 0 14px 36px rgba(251,191,36,0.3); }
  .cta-icon { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
  .cta-label { display: block; font-weight: 800; font-size: 1rem; font-family: 'Baloo 2', cursive; }
  .cta-hint  { display: block; font-size: 0.72rem; opacity: 0.7; font-weight: 500; margin-top: 1px; }
  .cta-arrow { margin-left: auto; font-size: 1.2rem; opacity: 0.6; transition: transform 0.2s; }
  .cta-farmer:hover .cta-arrow, .cta-buyer:hover .cta-arrow { transform: translateX(4px); opacity: 1; }

  /* ── Trust strip ── */
  .trust-strip {
    display: flex; align-items: center; gap: 0.8rem;
    flex-wrap: wrap;
  }
  .trust-item {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.82rem; font-weight: 600;
    color: #57534e;
  }
  .trust-divider { width: 1px; height: 14px; background: #d6d3d1; }

  /* ── Feature Cards ── */
  .hero-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.2rem;
  }
  @media (max-width: 500px) { .hero-right { grid-template-columns: 1fr; } }

  .feature-card {
    border: 1.5px solid;
    border-radius: 24px;
    padding: 1.6rem 1.4rem;
    display: flex; flex-direction: column; gap: 0.9rem;
    position: relative;
    transition: transform 0.3s, box-shadow 0.3s;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
  }
  .feature-card:hover { transform: translateY(-5px); box-shadow: 0 14px 36px rgba(0,0,0,0.10); }
  .feature-emoji { font-size: 2rem; line-height: 1; }
  .feature-body { flex: 1; }
  .feature-title {
    font-family: 'Baloo 2', cursive;
    font-size: 1.05rem; font-weight: 700;
    color: #1c1917; margin: 0 0 0.35rem;
  }
  .feature-desc { font-size: 0.85rem; color: #78716c; line-height: 1.55; margin: 0; }
  .feature-tag {
    align-self: flex-start;
    font-size: 0.7rem; font-weight: 700;
    padding: 0.2rem 0.7rem;
    border-radius: 99px;
    letter-spacing: 0.04em;
  }

  /* ── Scroll ribbon ── */
  .scroll-ribbon-container {
    position: relative; z-index: 10;
    overflow: hidden;
    background: linear-gradient(135deg, #14532d, #15803d);
    padding: 0.9rem 0;
    display: flex;
    white-space: nowrap;
  }
  .scroll-ribbon-container::before, .scroll-ribbon-container::after {
    content: '';
    position: absolute; top:0; bottom:0; width: 60px; z-index: 2;
    pointer-events: none;
  }
  .scroll-ribbon-container::before { left:0; background: linear-gradient(90deg,#14532d,transparent); }
  .scroll-ribbon-container::after  { right:0; background: linear-gradient(-90deg,#14532d,transparent); }
  
  .scroll-ribbon-track {
    display: flex; align-items: center; gap: 0;
    animation: ribbonScroll 28s linear infinite;
    width: max-content;
  }
  .scroll-ribbon-container:hover .scroll-ribbon-track { animation-play-state: paused; }

  @keyframes ribbonScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ribbon-item {
    font-size: 0.85rem; font-weight: 600;
    color: #bbf7d0;
    padding: 0 2.2rem;
    flex-shrink: 0;
    letter-spacing: 0.04em;
  }
  .ribbon-item::after { content: '•'; padding-left: 2.2rem; color: #4ade80; }

  /* ── Footer ── */
  .landing-footer {
    position: relative; z-index: 10;
    padding: 1.4rem 5%;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
    border-top: 1px solid #e7e5e4;
    background: rgba(255,253,246,0.8);
    backdrop-filter: blur(10px);
    font-size: 0.78rem; font-weight: 600;
    color: #78716c; letter-spacing: 0.04em;
  }
  .footer-links { display: flex; gap: 2rem; }
  .footer-links a { color: #78716c; text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: #16a34a; }
`;

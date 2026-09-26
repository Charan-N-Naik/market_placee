import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, Phone, User as UserIcon, MapPin, Building, Sprout, ArrowRight, Leaf, Map, Camera, X, AlertCircle, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ onLocationSelected }) {
  const [position, setPosition] = useState(null);
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      onLocationSelected(e.latlng);
    },
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      onLocationSelected(e.latlng);
    }
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}
import { loginSchema, farmerRegisterSchema, buyerRegisterSchema, deliveryAgentRegisterSchema } from '../lib/validations/authSchema';

const COUNTRY_CODES = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
];

export default function AuthPage({ mode = 'login' }) {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login, register, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const handleMapLocationSelect = async (latlng) => {
    setMapLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
      const d = await res.json();

      const village = d.address?.village || d.address?.suburb || d.address?.town || d.address?.city || '';
      const district = d.address?.state_district || d.address?.county || '';
      const state = d.address?.state || '';

      const setVal = (name, val) => {
        const el = document.querySelector(`input[name="${name}"]`);
        if (el) { const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeSet.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      setVal('village', village);
      setVal('district', district);
      setVal('state', state);

      setTimeout(() => setShowMapModal(false), 600);
    } catch (err) {
      console.error(err);
    } finally {
      setMapLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const isLogin = mode === 'login';
  const isFarmer = role === 'farmer';
  const isDeliveryAgent = role === 'delivery_agent' || role === 'driver';

  const schema = isLogin
    ? loginSchema
    : (isFarmer ? farmerRegisterSchema : (isDeliveryAgent ? deliveryAgentRegisterSchema : buyerRegisterSchema));

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setApiError('');
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const loggedUser = await login({ ...data, role: role || 'buyer' });
        const userRole = loggedUser?.role || role || 'buyer';
        if (userRole === 'farmer') navigate('/farmer/dashboard');
        else if (userRole === 'delivery_agent' || userRole === 'driver') navigate('/delivery/dashboard');
        else navigate('/buyer/dashboard');
      } else {
        const cleanPhone = (data.phone || '').trim();
        const fullPhone = `${countryCode}${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;
        const registerData = {
          ...data,
          phone: fullPhone,
          countryCode,
          role: role || 'buyer'
        };
        if (avatarFile) {
          registerData.avatar = avatarFile;
        }
        const registeredUser = await register(registerData);
        const userRole = registeredUser?.role || role || 'buyer';
        if (userRole === 'farmer') {
          navigate('/farmer/dashboard');
        } else if (userRole === 'delivery_agent' || userRole === 'driver') {
          navigate('/delivery/dashboard');
        } else {
          navigate('/buyer/dashboard');
        }
      }
    } catch (error) {
      setApiError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    reset();
    setApiError('');
    navigate(`/${isLogin ? 'register' : 'login'}/${role || 'buyer'}`);
  };

  const autoDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
            .then(r => r.json())
            .then(d => {
              const village = d.address?.village || d.address?.suburb || d.address?.town || d.address?.city || '';
              const district = d.address?.state_district || d.address?.county || '';
              const state = d.address?.state || '';
              const setVal = (name, val) => {
                const el = document.querySelector(`input[name="${name}"]`);
                if (el) { const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeSet.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); }
              };
              setVal('village', village);
              setVal('district', district);
              setVal('state', state);
            }).catch(() => { });
        },
        () => { },
        { enableHighAccuracy: true }
      );
    }
  };

  // Design tokens resolved per role
  const primary = isFarmer ? '#15803d' : '#ea580c';
  const primaryLight = isFarmer ? '#dcfce7' : '#ffedd5';
  const bgPage = isFarmer ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f4fbf7 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)';

  const inputStyle = (hasError) => ({
    width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem',
    border: `1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 12, outline: 'none',
    fontSize: '0.95rem', fontWeight: 600, color: '#1c1917',
    background: '#f9fafb', transition: 'all 0.2s ease',
  });
  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#78716c',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem'
  };
  const fieldWrap = { position: 'relative' };
  const iconStyle = {
    position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
    color: '#9ca3af', pointerEvents: 'none'
  };
  const errorStyle = { fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, marginTop: '0.35rem' };

  return (
    <>
      {/* Full-page layout */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bgPage, padding: '2rem 5%', fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              background: '#fff', borderRadius: 24,
              border: `1px solid ${primaryLight}`,
              boxShadow: `0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px ${primaryLight}`,
              overflow: 'hidden'
            }}
          >
            {/* Card Header */}
            <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: `1px solid ${primaryLight}`, textAlign: 'center' }}>
              <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Leaf size={20} color={primary} />
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1c1917', margin: 0, letterSpacing: '-0.03em' }}>
                  Kisan<span style={{ color: primary }}>Bazaar</span>
                </h1>
              </Link>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 600, margin: 0 }}>
                {isLogin
                  ? `Sign in to your ${isFarmer ? 'Farmer' : 'Buyer'} portal`
                  : `Join as a ${isFarmer ? 'Farmer 🌾' : 'Buyer 🛒'} today`}
              </p>
            </div>

            {/* Form body */}
            <div style={{ padding: '1.75rem 2rem' }}>
              {/* Error */}
              <AnimatePresence>
                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      background: '#fef2f2', color: '#b91c1c', borderRadius: 12,
                      padding: '0.875rem 1rem', marginBottom: '1.25rem',
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      border: '1px solid #fecaca', fontSize: '0.85rem', fontWeight: 700
                    }}
                  >
                    <AlertCircle size={16} />
                    {apiError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Register-only fields */}
                {!isLogin && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.25rem' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 84, height: 84, borderRadius: '50%',
                          border: `3px solid ${primaryLight}`, overflow: 'hidden',
                          background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 4px 16px rgba(0,0,0,0.08)`,
                        }}>
                          {avatarPreview
                            ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <UserIcon size={34} color="#d1d5db" />
                          }
                        </div>
                        <label style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 28, height: 28, borderRadius: '50%',
                          background: primary, color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '2px solid #fff'
                        }}>
                          <Camera size={13} />
                          <input type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
                        </label>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <div style={fieldWrap}>
                        <UserIcon size={16} style={iconStyle} />
                        <input
                          {...formRegister('name')}
                          style={inputStyle(errors.name)}
                          placeholder="John Doe"
                        />
                      </div>
                      {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                        {/* Country Code Select */}
                        <div style={{ position: 'relative', width: '124px', flexShrink: 0 }}>
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            aria-label="Country Code"
                            style={{
                              width: '100%',
                              height: '100%',
                              padding: '0.875rem 1.6rem 0.875rem 0.75rem',
                              border: `1.5px solid ${errors.phone ? '#ef4444' : '#e5e7eb'}`,
                              borderRadius: 12,
                              outline: 'none',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#1c1917',
                              background: '#f9fafb',
                              cursor: 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={`${c.code}-${c.dial}`} value={c.dial}>
                                {c.flag} {c.dial}
                              </option>
                            ))}
                          </select>
                          <div style={{
                            position: 'absolute',
                            right: '0.55rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <ChevronDown size={14} />
                          </div>
                        </div>

                        {/* Phone Digits Input */}
                        <div style={{ ...fieldWrap, flex: 1 }}>
                          <Phone size={16} style={iconStyle} />
                          <input
                            type="tel"
                            {...formRegister('phone')}
                            style={inputStyle(errors.phone)}
                            placeholder="9876543210"
                            maxLength={15}
                          />
                        </div>
                      </div>
                      {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
                    </div>

                    {/* Location */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Location</label>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="button" onClick={() => setShowMapModal(true)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 800, color: primary,
                            display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            <MapPin size={12} /> Map
                          </button>
                          <button type="button" onClick={autoDetectLocation} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 800, color: primary,
                            display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            <Map size={12} /> Auto-detect
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                        {['village', 'district', 'state'].map((f, i) => (
                          <div key={f}>
                            <input
                              {...formRegister(f)}
                              style={{ ...inputStyle(errors[f]), padding: '0.7rem 0.75rem', fontSize: '0.82rem' }}
                              placeholder={['Village/City', 'District', 'State'][i]}
                            />
                            {errors[f] && <p style={{ ...errorStyle, fontSize: '0.65rem' }}>{errors[f].message}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Farmer-specific */}
                    {isFarmer && (
                      <div className="space-y-3">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={labelStyle}>Farm Size</label>
                            <div style={fieldWrap}>
                              <MapPin size={16} style={iconStyle} />
                              <input {...formRegister('farmSize')} style={inputStyle(errors.farmSize)} placeholder="e.g. 5 acres" />
                            </div>
                            {errors.farmSize && <p style={errorStyle}>{errors.farmSize.message}</p>}
                          </div>
                          <div>
                            <label style={labelStyle}>Primary Crops</label>
                            <div style={fieldWrap}>
                              <Sprout size={16} style={iconStyle} />
                              <input {...formRegister('primaryCrops')} style={inputStyle(errors.primaryCrops)} placeholder="Wheat, Rice..." />
                            </div>
                            {errors.primaryCrops && <p style={errorStyle}>{errors.primaryCrops.message}</p>}
                          </div>
                        </div>

                        <div>
                          <label style={labelStyle}>Kisan Card ID / Aadhaar No. (Verification)</label>
                          <div style={fieldWrap}>
                            <Leaf size={16} style={iconStyle} />
                            <input {...formRegister('kisanId')} style={inputStyle(errors.kisanId)} placeholder="e.g. KSN-882190 or Aadhaar 12-digit" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Buyer-specific */}
                    {!isFarmer && (
                      <div className="space-y-3">
                        <div>
                          <label style={labelStyle}>Business Name</label>
                          <div style={fieldWrap}>
                            <Building size={16} style={iconStyle} />
                            <input {...formRegister('businessName')} style={inputStyle(errors.businessName)} placeholder="Your Company Ltd." />
                          </div>
                          {errors.businessName && <p style={errorStyle}>{errors.businessName.message}</p>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={labelStyle}>GSTIN Number (Optional)</label>
                            <div style={fieldWrap}>
                              <Building size={16} style={iconStyle} />
                              <input {...formRegister('gstNumber')} style={inputStyle(errors.gstNumber)} placeholder="29ABCDE1234F1Z5" />
                            </div>
                          </div>
                          <div>
                            <label style={labelStyle}>APMC Trade License No.</label>
                            <div style={fieldWrap}>
                              <Building size={16} style={iconStyle} />
                              <input {...formRegister('licenseNumber')} style={inputStyle(errors.licenseNumber)} placeholder="APMC-KA-99120" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Email */}
                <div>
                  <label style={labelStyle}>{isLogin ? 'Email or Phone' : 'Email Address'}</label>
                  <div style={fieldWrap}>
                    <Mail size={16} style={iconStyle} />
                    <input
                      id="email"
                      type={isLogin ? "text" : "email"}
                      autoComplete={isLogin ? "username email" : "email"}
                      {...formRegister(isLogin ? 'loginId' : 'email')}
                      style={inputStyle(errors.loginId || errors.email)}
                      placeholder={isLogin ? 'Enter email or phone' : 'you@example.com'}
                    />
                  </div>
                  {(errors.loginId || errors.email) && <p style={errorStyle}>{(errors.loginId || errors.email).message}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    {isLogin && (
                      <Link to="/forgot-password" style={{ fontSize: '0.72rem', fontWeight: 800, color: primary, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div style={{ ...fieldWrap }}>
                    <Lock size={16} style={iconStyle} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      {...formRegister('password')}
                      style={{ ...inputStyle(errors.password), paddingRight: '3rem' }}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex'
                    }}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                {!isLogin && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label style={labelStyle}>Confirm Password</label>
                    <div style={fieldWrap}>
                      <Lock size={16} style={iconStyle} />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...formRegister('confirmPassword')}
                        style={{ ...inputStyle(errors.confirmPassword), paddingRight: '3rem' }}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{
                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex'
                      }}>
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%', padding: '0.95rem',
                    background: isSubmitting ? '#9ca3af' : primary,
                    color: '#fff', border: 'none', borderRadius: 14,
                    fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.05em',
                    textTransform: 'uppercase', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    boxShadow: `0 4px 16px ${primary}33`,
                    transition: 'all 0.2s ease', marginTop: '0.5rem'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" opacity="0.25" />
                        <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.25rem 2rem', background: '#fafaf9',
              borderTop: `1px solid ${primaryLight}`, textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: 600 }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleMode}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontFamily: 'inherit', fontWeight: 900, cursor: 'pointer',
                    color: primary, textDecoration: 'underline', fontSize: '0.875rem'
                  }}
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </motion.div>

          {/* Role toggle hints */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }} className="flex flex-wrap items-center justify-center gap-2">
            <span>Switch portal:</span>
            <Link to={`/${isLogin ? 'login' : 'register'}/farmer`} style={{ color: '#15803d', fontWeight: 800, textDecoration: 'none' }}>
              🌾 Farmer
            </Link>
            <span>•</span>
            <Link to={`/${isLogin ? 'login' : 'register'}/buyer`} style={{ color: '#ea580c', fontWeight: 800, textDecoration: 'none' }}>
              🛒 Buyer
            </Link>
            <span>•</span>
            <Link to={`/${isLogin ? 'login' : 'register'}/delivery_agent`} style={{ color: '#1F7A4D', fontWeight: 800, textDecoration: 'none' }}>
              🚚 Delivery Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '1rem',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: '#fff', borderRadius: 24, overflow: 'hidden',
                width: '100%', maxWidth: 680, height: '70vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 80px rgba(0,0,0,0.25)'
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6',
                background: '#fafaf9'
              }}>
                <div>
                  <h3 style={{ fontWeight: 900, color: '#111827', fontSize: '1rem', margin: 0 }}>Select Your Location</h3>
                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '2px 0 0', fontWeight: 600 }}>Click anywhere on the map</p>
                </div>
                <button
                  onClick={() => setShowMapModal(false)}
                  style={{
                    background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '0.4rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6b7280'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, position: 'relative', background: '#f3f4f6' }}>
                <MapContainer
                  center={[12.9716, 77.5946]}
                  zoom={7}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker onLocationSelected={handleMapLocationSelect} />
                </MapContainer>

                {mapLoading && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      background: '#fff', borderRadius: 99, padding: '0.625rem 1.25rem',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      display: 'flex', alignItems: 'center', gap: '0.625rem'
                    }}>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke={primary} strokeWidth="4" opacity="0.25" />
                        <path d="M4 12a8 8 0 018-8" stroke={primary} strokeWidth="4" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#374151' }}>Fetching location...</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

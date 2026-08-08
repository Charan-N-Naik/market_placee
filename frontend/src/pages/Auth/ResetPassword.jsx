import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { resetPasswordSchema } from '../../lib/validations/authSchema';
import api from '../../api/axios';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    setApiError('');
    setIsSubmitting(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: data.password });
      alert('Password reset successful. Please login with your new password.');
      navigate('/');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-4 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Set New Password</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            Please enter your new password below.
          </p>
        </div>

        {apiError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold mb-6">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={`block w-full px-4 py-3 bg-gray-50 border ${errors.password ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={`block w-full px-4 py-3 bg-gray-50 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-70 flex justify-center items-center"
          >
            {isSubmitting ? (
               <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
              <>Reset Password <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-block text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
            Cancel and return home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

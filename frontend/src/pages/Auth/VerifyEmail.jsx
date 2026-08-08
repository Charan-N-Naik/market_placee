import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data } = await api.get(`/auth/verify/${token}`);
        setMessage(data.message);
        setStatus('success');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Verification failed. Link may be invalid or expired.');
        setStatus('error');
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
        
        {status === 'verifying' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-black text-gray-900">Verifying your email...</h2>
            <p className="text-gray-500 mt-2 font-medium">Please wait a moment</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Email Verified!</h2>
            <p className="text-gray-500 mt-2 mb-8 font-medium">{message}</p>
            <Link 
              to="/" 
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg transition-colors"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <XCircle className="text-red-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Verification Failed</h2>
            <p className="text-gray-500 mt-2 mb-8 font-medium">{message}</p>
            <Link 
              to="/" 
              className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-black rounded-xl shadow-lg transition-colors"
            >
              Return Home
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

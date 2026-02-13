import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VerifyAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/verify_account`, {
          params: { token }
        });
        setStatus('success');
        setMessage(response.data.message || 'Account verified successfully!');
        toast.success('Email verified! You can now login.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Verification failed');
        toast.error(error.response?.data?.error || 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-100 shadow-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Verifying your account...</h2>
            <p className="text-slate-600">Please wait while we verify your email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Success!</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-[#003366] hover:bg-[#002244] text-white"
            >
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Verification Failed</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-[#003366] hover:bg-[#002244] text-white"
            >
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyAccount;
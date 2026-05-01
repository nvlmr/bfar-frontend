import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FileText, Mail, Key, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '../lib/apiMiddleware';

const VerifyResetCode = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !code) {
      toast.error('Please enter your email and verification code');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/verify_reset_code', {
        code: code.trim(),
        email: email.trim(),
      });

      // If verification succeeds, use the same code as token for password reset
      toast.success('Code verified successfully! Set your new password now.');
      navigate(`/reset-password?token=${encodeURIComponent(code.trim())}`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center p-4">
      <div className="relative max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 md:p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#00AEEF] rounded-xl flex items-center justify-center">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#003366]">BFAR e-Forms</h1>
            <p className="text-sm text-slate-600">Enter the code from your email</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#003366] mb-2">Verification Code</h2>
          <p className="text-slate-600">Enter the code we sent to your email to continue resetting your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-12"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="code">Verification Code</Label>
            <div className="relative mt-2">
              <Key className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="pl-12"
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#003366] hover:bg-[#002244] text-white" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            Didn&apos;t receive a code?{' '}
            <Link to="/forgot-password" className="font-semibold text-cyan-600 hover:text-cyan-700">
              Request again
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-600 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetCode;

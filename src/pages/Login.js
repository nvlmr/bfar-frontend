import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1760774155577-f2f7af995b13?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwzfHx1bmRlcndhdGVyJTIwZmlzaCUyMHNjaG9vbCUyMGJsdWV8ZW58MHx8fHwxNzcwODYwODc3fDA&ixlib=rb-4.1.0&q=85)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/90 to-[#001a33]/90" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Welcome Back to BFAR e-Forms</h2>
          <p className="text-lg text-white/90">
            Continue managing your surveys and collecting valuable data for Philippine aquatic resources.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8FDFF]">
        <div className="w-full max-w-md">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-[#00AEEF] rounded-lg flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#003366]">BFAR e-Forms</h1>
          </div>

          <h2 className="text-3xl font-bold text-[#003366] mb-2">Login to Your Account</h2>
          <p className="text-base text-slate-600 mb-8">Enter your credentials to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-[#003366]">Email Address</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-[#003366]">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            <Button 
              type="submit" 
              data-testid="login-submit-button"
              className="w-full bg-[#003366] hover:bg-[#002244] text-white py-3 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" data-testid="login-signup-link" className="text-[#00AEEF] hover:text-[#0086cc] font-medium">
              Sign up
            </Link>
          </p>

          <div className="mt-8 text-center">
            <Link to="/" data-testid="login-back-home-link" className="text-sm text-slate-500 hover:text-[#003366]">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

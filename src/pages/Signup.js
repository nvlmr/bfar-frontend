import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(
        formData.first_name,
        formData.middle_name,
        formData.last_name,
        formData.email,
        formData.password
      );
      
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate('/login');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Signup failed. Please try again.';
      toast.error(errorMessage);
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
          <h2 className="text-4xl font-bold mb-4">Join BFAR e-Forms Today</h2>
          <p className="text-lg text-white/90">
            Start creating professional surveys and collecting data to support Philippine fisheries and aquatic resources management.
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

          <h2 className="text-3xl font-bold text-[#003366] mb-2">Create Your Account</h2>
          <p className="text-base text-slate-600 mb-8">Get started by creating your account</p>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="signup-form">
            {/* First Name */}
            <div>
              <Label htmlFor="first_name" className="text-[#003366]">First Name</Label>
              <Input
                id="first_name"
                type="text"
                placeholder="Juan"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            {/* Middle Name */}
            <div>
              <Label htmlFor="middle_name" className="text-[#003366]">Middle Name (Optional)</Label>
              <Input
                id="middle_name"
                type="text"
                placeholder="Dela Cruz"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                className="form-input mt-2"
              />
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="last_name" className="text-[#003366]">Last Name</Label>
              <Input
                id="last_name"
                type="text"
                placeholder="Santos"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-[#003366]">Email Address</Label>
              <Input
                id="email"
                data-testid="signup-email-input"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-[#003366]">Password</Label>
              <Input
                id="password"
                data-testid="signup-password-input"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="form-input mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-[#003366]">Confirm Password</Label>
              <Input
                id="confirmPassword"
                data-testid="signup-confirm-password-input"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="form-input mt-2"
              />
            </div>

            <Button 
              type="submit" 
              data-testid="signup-submit-button"
              className="w-full bg-[#003366] hover:bg-[#002244] text-white py-3 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" data-testid="signup-login-link" className="text-[#00AEEF] hover:text-[#0086cc] font-medium">
              Login
            </Link>
          </p>

          <div className="mt-8 text-center">
            <Link to="/" data-testid="signup-back-home-link" className="text-sm text-slate-500 hover:text-[#003366]">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
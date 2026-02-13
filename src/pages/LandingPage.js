import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart3, Share2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <div 
        className="hero-section" 
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1768862042432-b4af45271413?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBmaXNoJTIwZmFybSUyMGFxdWFjdWx0dXJlfGVufDB8fHx8MTc3MDg2MDg3N3ww&ixlib=rb-4.1.0&q=85)' }}
      >
        <div className="hero-content">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#00AEEF] rounded-lg flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">BFAR e-Forms</h1>
              </div>
              <div className="flex space-x-4">
                <Button 
                  data-testid="nav-login-button"
                  onClick={() => navigate('/login')} 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                >
                  Login
                </Button>
                <Button 
                  data-testid="nav-signup-button"
                  onClick={() => navigate('/signup')} 
                  className="bg-[#00AEEF] hover:bg-[#0086cc] text-white"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </nav>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                Streamline Data Collection for
                <br />
                <span className="text-[#00AEEF]">Philippine Aquatic Resources</span>
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                Bureau of Fisheries and Aquatic Resources official digital forms platform.
                Create surveys, collect responses, and analyze data efficiently.
              </p>
              <div className="flex justify-center space-x-4">
                <Button 
                  data-testid="hero-get-started-button"
                  onClick={() => navigate('/signup')} 
                  size="lg"
                  className="bg-[#00AEEF] hover:bg-[#0086cc] text-white text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                >
                  Get Started
                </Button>
                <Button 
                  data-testid="hero-learn-more-button"
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} 
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-lg px-8 py-6 h-auto"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#003366] mb-4">
              Powerful Features for Data Collection
            </h3>
            <p className="text-base leading-relaxed text-slate-600 max-w-2xl mx-auto">
              Everything you need to create, distribute, and analyze surveys for fisheries and aquatic resources management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="feature-card" data-testid="feature-form-builder">
              <div className="w-14 h-14 bg-[#003366] rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-[#003366] mb-3">Easy Form Builder</h4>
              <p className="text-base leading-relaxed text-slate-600">
                Create dynamic questionnaires with multiple question types including text, multiple choice, checkboxes, and more.
              </p>
            </div>

            <div className="feature-card" data-testid="feature-real-time">
              <div className="w-14 h-14 bg-[#00AEEF] rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-[#003366] mb-3">Real-time Analytics</h4>
              <p className="text-base leading-relaxed text-slate-600">
                Visualize responses instantly with charts and graphs. Make data-driven decisions faster.
              </p>
            </div>

            <div className="feature-card" data-testid="feature-sharing">
              <div className="w-14 h-14 bg-[#003366] rounded-xl flex items-center justify-center mb-4">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-[#003366] mb-3">Easy Sharing</h4>
              <p className="text-base leading-relaxed text-slate-600">
                Share forms via public links. Collect responses from fishermen, stakeholders, and communities.
              </p>
            </div>

            <div className="feature-card" data-testid="feature-secure">
              <div className="w-14 h-14 bg-[#00AEEF] rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-2xl font-semibold tracking-tight text-[#003366] mb-3">Secure & Reliable</h4>
              <p className="text-base leading-relaxed text-slate-600">
                Government-grade security for your sensitive data. Reliable infrastructure for critical operations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-gradient-to-b from-[#003366] to-[#001a33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-6">
            Ready to Get Started?
          </h3>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join BFAR staff and partners in modernizing data collection for Philippine aquatic resources.
          </p>
          <Button 
            data-testid="cta-signup-button"
            onClick={() => navigate('/signup')} 
            size="lg"
            className="bg-[#00AEEF] hover:bg-[#0086cc] text-white text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
          >
            Create Your First Form
          </Button>
        </div>
      </div>

      <footer className="bg-[#001a33] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-[#00AEEF] rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-bold">BFAR e-Forms</h4>
              </div>
              <p className="text-sm text-white/70">
                Official digital forms platform for the Bureau of Fisheries and Aquatic Resources.
              </p>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a></li>
                <li><button onClick={() => navigate('/login')} className="text-white/80 hover:text-white transition-colors">Login</button></li>
                <li><button onClick={() => navigate('/signup')} className="text-white/80 hover:text-white transition-colors">Sign Up</button></li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">Contact</h5>
              <p className="text-sm text-white/80">
                Bureau of Fisheries and Aquatic Resources<br />
                Department of Agriculture<br />
                Philippines
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/60">
            <p>&copy; 2026 BFAR e-Forms. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormFill from './pages/FormFill';
import FormResponses from './pages/FormResponses';
import FormAnalytics from './pages/FormAnalytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import VerifyAccount from './pages/VerifyAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forms/new" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
          <Route path="/forms/:id/edit" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
          <Route path="/forms/:id/responses" element={<ProtectedRoute><FormResponses /></ProtectedRoute>} />
          <Route path="/forms/:id/analytics" element={<ProtectedRoute><FormAnalytics /></ProtectedRoute>} />
          <Route path="/f/:id" element={<FormFill />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

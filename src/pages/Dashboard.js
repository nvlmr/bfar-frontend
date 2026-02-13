import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, BarChart3, Trash2, Edit, Share2, LogOut, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.status !== 'active') {
      toast.error('Please verify your email before creating forms');
      // Optionally disable create form button
    }
  }, [user]);

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API}/forms`);
      setForms(response.data);
    } catch (error) {
      toast.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form? All responses will be deleted.')) {
      return;
    }

    try {
      await axios.delete(`${API}/forms/${formId}`);
      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const copyFormLink = (formId) => {
    const link = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(link);
    toast.success('Form link copied to clipboard!');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#00AEEF] rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#003366]">BFAR e-Forms</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">{user?.full_name}</span>
              <Button 
                data-testid="logout-button"
                onClick={handleLogout} 
                variant="ghost" 
                size="sm"
                className="text-slate-600 hover:text-[#003366]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#003366]">Your Forms</h2>
            <p className="text-base leading-relaxed text-slate-600 mt-2">
              Create, manage, and analyze your surveys
            </p>
          </div>
          <Button 
            data-testid="create-form-button"
            onClick={() => {
              if (user?.status !== 'active') {
                toast.error('Please verify your email first');
                return;
              }
              navigate('/forms/new');
            }}
            className="bg-[#003366] hover:bg-[#002244] text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            disabled={user?.status !== 'active'}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Form
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-forms-state">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No forms yet</h3>
            <p className="text-slate-600 mb-6">Create your first form to start collecting responses</p>
            <Button 
              data-testid="empty-create-form-button"
              onClick={() => navigate('/forms/new')}
              className="bg-[#003366] hover:bg-[#002244] text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Form
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6" data-testid="forms-grid">
            {forms.map((form) => (
              <Card key={form.id} className="dashboard-card" data-testid={`form-card-${form.id}`}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#003366] mb-2 line-clamp-2">
                    {form.title}
                  </h3>
                  {form.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{form.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
                  <span>{form.questions.length} questions</span>
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {form.response_count} responses
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid={`edit-form-${form.id}`}
                    onClick={() => navigate(`/forms/${form.id}/edit`)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    data-testid={`view-responses-${form.id}`}
                    onClick={() => navigate(`/forms/${form.id}/responses`)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Responses
                  </Button>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    data-testid={`view-analytics-${form.id}`}
                    onClick={() => navigate(`/forms/${form.id}/analytics`)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Analytics
                  </Button>
                  <Button
                    data-testid={`copy-link-${form.id}`}
                    onClick={() => copyFormLink(form.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`delete-form-${form.id}`}
                    onClick={() => handleDeleteForm(form.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

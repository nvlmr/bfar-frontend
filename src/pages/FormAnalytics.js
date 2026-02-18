import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#003366', '#005c99', '#0086cc', '#00aeff', '#66d9ff'];

const FormAnalytics = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const [formRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/forms/${id}`, config),
        axios.get(`${API}/forms/analytics/${id}`, config)
      ]);

      setForm(formRes.data);
      setAnalytics(analyticsRes.data);

    } catch (error) {
      console.error("Analytics Error:", error);
      toast.error('Failed to fetch analytics');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };


  // ✅ Prevent crash while loading
  if (loading || !form || !analytics) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <p className="text-slate-600">Loading analytics...</p>
      </div>
    );
  }

  const totalResponses = analytics.total_responses || 0;
  const questionsData = analytics.questions || [];

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="text-slate-600 hover:text-[#003366]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#003366] mb-2">
            {form.title}
          </h2>
          <p className="text-base text-slate-600">
            Analytics Overview - {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
          </p>
        </div>

        {totalResponses === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No data to analyze yet
            </h3>
            <p className="text-slate-600">
              Collect responses to see analytics
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {questionsData.map((questionData, index) => {

              if (!questionData) return null;

              // -----------------------
              // MULTIPLE CHOICE TYPES
              // -----------------------
              if (['multiple_choice', 'checkboxes', 'dropdown'].includes(questionData.type)) {

                const chartData = (questionData.responses || []).map((r) => ({
                  name: r.option,
                  value: r.count
                }));

                return (
                  <Card key={index} className="p-6">
                    <h3 className="text-xl font-semibold text-[#003366] mb-6">
                      {questionData.title}
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#003366" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                );
              }

              // -----------------------
              // RATING
              // -----------------------
              if (questionData.type === 'rating') {

                const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

                (questionData.responses || []).forEach((r) => {
                  ratingCounts[r] = (ratingCounts[r] || 0) + 1;
                });

                const chartData = Object.entries(ratingCounts).map(([rating, count]) => ({
                  name: `${rating} Star`,
                  value: count
                }));

                const avgRating =
                  questionData.responses?.length > 0
                    ? (
                        questionData.responses.reduce((sum, r) => sum + r, 0) /
                        questionData.responses.length
                      ).toFixed(1)
                    : 0;

                return (
                  <Card key={index} className="p-6">
                    <h3 className="text-xl font-semibold text-[#003366] mb-2">
                      {questionData.title}
                    </h3>
                    <p className="text-2xl font-bold text-[#00AEEF] mb-6">
                      Average: {avgRating} / 5
                    </p>

                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#00AEEF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                );
              }

              // -----------------------
              // TEXT RESPONSES
              // -----------------------
              return (
                <Card key={index} className="p-6">
                  <h3 className="text-xl font-semibold text-[#003366] mb-4">
                    {questionData.title}
                  </h3>

                  {(questionData.responses || []).map((response, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 mb-2">
                      <p className="text-slate-700">{response}</p>
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormAnalytics;

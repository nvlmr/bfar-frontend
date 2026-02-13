import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
      const [formRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/forms/${id}`),
        axios.get(`${API}/analytics/${id}`)
      ]);
      setForm(formRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <p className="text-slate-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button
              data-testid="back-to-dashboard-button"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-slate-600 hover:text-[#003366]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#003366] mb-2">{form.title}</h2>
          <p className="text-base text-slate-600">
            Analytics Overview - {analytics.total_responses} {analytics.total_responses === 1 ? 'response' : 'responses'}
          </p>
        </div>

        {analytics.total_responses === 0 ? (
          <div className="text-center py-20" data-testid="no-analytics">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No data to analyze yet</h3>
            <p className="text-slate-600">Collect responses to see analytics and insights</p>
          </div>
        ) : (
          <div className="space-y-8" data-testid="analytics-container">
            {analytics.questions.map((questionData, index) => {
              const question = form.questions.find((q) => q.id === questionData.question_id);
              
              if (['multiple_choice', 'checkboxes', 'dropdown'].includes(questionData.type)) {
                const chartData = questionData.responses.map((r) => ({
                  name: r.option,
                  value: r.count
                }));

                return (
                  <Card key={questionData.question_id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`analytics-${index}`}>
                    <h3 className="text-xl font-semibold text-[#003366] mb-6">{questionData.title}</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Bar Chart</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                            <YAxis tick={{ fill: '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            />
                            <Bar dataKey="value" fill="#003366" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Pie Chart</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {questionData.responses.map((r, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 mb-1">{r.option}</p>
                            <p className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                              {r.count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              }

              if (questionData.type === 'rating') {
                const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                questionData.responses.forEach((r) => {
                  ratingCounts[r] = (ratingCounts[r] || 0) + 1;
                });
                const chartData = Object.entries(ratingCounts).map(([rating, count]) => ({
                  name: `${rating} Star${rating > 1 ? 's' : ''}`,
                  value: count
                }));
                const avgRating = questionData.responses.length > 0
                  ? (questionData.responses.reduce((sum, r) => sum + r, 0) / questionData.responses.length).toFixed(1)
                  : 0;

                return (
                  <Card key={questionData.question_id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`analytics-${index}`}>
                    <h3 className="text-xl font-semibold text-[#003366] mb-2">{questionData.title}</h3>
                    <p className="text-3xl font-bold text-[#00AEEF] mb-6">Average: {avgRating} / 5</p>
                    
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                        <YAxis tick={{ fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <Bar dataKey="value" fill="#00AEEF" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                );
              }

              return (
                <Card key={questionData.question_id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`analytics-${index}`}>
                  <h3 className="text-xl font-semibold text-[#003366] mb-4">{questionData.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {questionData.responses.length} {questionData.responses.length === 1 ? 'response' : 'responses'}
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {questionData.responses.map((response, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-slate-700">{response}</p>
                      </div>
                    ))}
                  </div>
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

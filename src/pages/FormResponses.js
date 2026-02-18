import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FormResponses = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [formRes, responsesRes] = await Promise.all([
        axios.get(`${API}/forms/${id}`),
        axios.get(`${API}/forms/${id}/responses`)
      ]);
      setForm(formRes.data); 
      setResponses(responsesRes.data);
      console.log(responsesRes.data);
    } catch (error) {
      toast.error('Failed to fetch responses');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (responses.length === 0) {
      toast.error('No responses to download');
      return;
    }

    const headers = ['Response ID', 'Submitted At', ...form.questions.map((q) => q.title)];
    const rows = responses.map((response) => {
    const submittedDate = response.submitted_at?._seconds
      ? new Date(response.submitted_at._seconds * 1000).toLocaleString()
      : "No date";
    const row = [response.id, submittedDate];

      form.questions.forEach((questiofn) => {
        const answer = response.answers.find((a) => a.question_id === question.id);
        if (answer) {
          if (Array.isArray(answer.answer)) {
            row.push(answer.answer.join(', '));
          } else {
            row.push(answer.answer);
          }
        } else {
          row.push('');
        }
      });
      return row;
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title}-responses.csv`;
    a.click();
    toast.success('CSV downloaded successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <p className="text-slate-600">Loading responses...</p>
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
            <Button
              data-testid="download-csv-button"
              onClick={downloadCSV}
              variant="outline"
              disabled={responses.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#003366] mb-2">{form.title}</h2>
          <p className="text-base text-slate-600">
            {responses.length} {responses.length === 1 ? 'response' : 'responses'}
          </p>
        </div>

        {responses.length === 0 ? (
          <div className="text-center py-20" data-testid="no-responses">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No responses yet</h3>
            <p className="text-slate-600">Share your form to start collecting responses</p>
          </div>
        ) : (
          <div className="space-y-6" data-testid="responses-list">
            {responses.map((response, rIndex) => (
              <Card key={response.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`response-${rIndex}`}>
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500">
                    Submitted: {
                      response.submitted_at?._seconds
                        ? new Date(response.submitted_at._seconds * 1000).toLocaleString()
                        : "No date"
                    }
                  </p>
                </div>
                <div className="space-y-4">
                  {form.questions.map((question, qIndex) => {
                    const answer = response.answers.find((a) => a.question_id === question.id);
                    return (
                      <div key={question.id} data-testid={`response-${rIndex}-question-${qIndex}`}>
                        <p className="font-semibold text-[#003366] mb-2">{question.title}</p>
                        <p className="text-slate-700">
                          {answer ? (
                            Array.isArray(answer.answer) ? (
                              answer.answer.join(', ')
                            ) : (
                              answer.answer
                            )
                          ) : (
                            <span className="text-slate-400">No answer</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponses;

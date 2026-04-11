import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';
import { api } from '../lib/apiMiddleware';
import { preprocessResponsesForML } from '../lib/preprocessing';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FormResponses = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [mlProcessedResponses, setMlProcessedResponses] = useState([]);
  const [mlEnabled, setMlEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [formRes, responsesRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/forms/${id}/responses`)
      ]);
      setForm(formRes.data); 
      setResponses(responsesRes.data);

      // Process responses for ML preprocessing
      if (responsesRes.data && responsesRes.data.length > 0) {
        const mlProcessed = preprocessResponsesForML(responsesRes.data, formRes.data.questions || []);
        setMlProcessedResponses(mlProcessed);
      }

      // console.log(responsesRes.data);
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

      form.questions.forEach((question) => {
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

  const getResponderMetadata = (response) => {
    // Prefer top-level fields (from new responses)
    const name = response.full_name || response.name || response.respondent_name || response.respondent?.name || response.user?.name;
    const age = response.age || response.respondent?.age || response.user?.age;
    const sex = response.gender || response.sex || response.respondent?.sex || response.respondent?.gender || response.user?.sex || response.user?.gender;
    const email = response.email || response.user?.email || response.respondent?.email;

    const answerMap = (response.answers || []).reduce((map, answer) => {
      const label = (answer.question_title || answer.question_label || answer.label || '').toString().toLowerCase();
      if (label) {
        map[label] = answer.answer;
      }
      return map;
    }, {});

    return {
      name: name || answerMap['name'] || answerMap['full name'] || answerMap['respondent name'] || answerMap['participant name'],
      age: age || answerMap['age'],
      sex: sex || answerMap['sex'] || answerMap['gender'],
      email: email || answerMap['email']
    };
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
            <div className="flex items-center gap-4">
              {responses.length > 0 && (
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-600">ML Analysis</span>
                  <Switch
                    checked={mlEnabled}
                    onCheckedChange={setMlEnabled}
                    className="data-[state=checked]:bg-[#003366]"
                  />
                </div>
              )}
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
                  {(() => {
                    const responder = getResponderMetadata(response);
                    return (responder.name || responder.age || responder.sex || responder.email) ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm uppercase tracking-[0.18em] text-slate-500 mb-3">Responder</p>
                        <div className="grid gap-3 sm:grid-cols-4 text-sm">
                          {responder.name && (
                            <div>
                              <p className="text-slate-600">Name</p>
                              <p className="font-medium text-slate-900">{responder.name}</p>
                            </div>
                          )}
                          {responder.email && (
                            <div>
                              <p className="text-slate-600">Email</p>
                              <p className="font-medium text-slate-900">{responder.email}</p>
                            </div>
                          )}
                          {responder.age && (
                            <div>
                              <p className="text-slate-600">Age</p>
                              <p className="font-medium text-slate-900">{responder.age}</p>
                            </div>
                          )}
                          {responder.sex && (
                            <div>
                              <p className="text-slate-600">Sex</p>
                              <p className="font-medium text-slate-900">{responder.sex}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {form.questions.map((question, qIndex) => {
                    const answer = response.answers.find((a) => a.question_id === question.id);
                    const mlData = mlEnabled ? mlProcessedResponses.find(r => r.id === response.id)?.[`${question.id}_ml`] : null;

                    return (
                      <div key={question.id} data-testid={`response-${rIndex}-question-${qIndex}`}>
                        <p className="font-semibold text-[#003366] mb-2">{question.title}</p>
                        <div className="space-y-2">
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

                          {/* ML Analysis Display */}
                          {mlEnabled && mlData && (question.type === 'short_text' || question.type === 'long_text') && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <h5 className="text-sm font-medium text-slate-700 mb-2">AI Analysis:</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <span className="text-slate-600">Words:</span>
                                  <span className="ml-1 font-medium">{mlData.features.wordCount}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Sentiment:</span>
                                  <span className={`ml-1 font-medium ${
                                    mlData.features.sentimentScore > 0.1 ? 'text-green-600' :
                                    mlData.features.sentimentScore < -0.1 ? 'text-red-600' : 'text-slate-600'
                                  }`}>
                                    {mlData.features.sentimentScore > 0 ? '+' : ''}{mlData.features.sentimentScore.toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Readability:</span>
                                  <span className="ml-1 font-medium">{mlData.features.readabilityScore.toFixed(1)}/10</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Unique Words:</span>
                                  <span className="ml-1 font-medium">{mlData.features.uniqueWords}</span>
                                </div>
                              </div>
                              {mlData.tokens.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-slate-600 text-xs">Key terms:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {mlData.tokens.slice(0, 8).map((token, idx) => (
                                      <span key={idx} className="inline-block bg-[#003366] text-white text-xs px-2 py-1 rounded-full">
                                        {token}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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

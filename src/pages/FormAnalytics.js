import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
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
  Legend,
  ResponsiveContainer
} from 'recharts';
import { preprocessAnalyticsData, preprocessResponsesForML, generateTFIDF } from '../lib/preprocessing';
import { api } from '../lib/apiMiddleware';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHART_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#ddb02b'];

const computeQuestionAnalytics = (responses, question) => {
  const answers = responses
    .map((response) => response.answers?.find((answer) => answer.question_id === question.id))
    .filter(Boolean);

  if (['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)) {
    const optionCounts = {};
    answers.forEach((answer) => {
      const value = answer.answer;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          optionCounts[item] = (optionCounts[item] || 0) + 1;
        });
      } else {
        optionCounts[value] = (optionCounts[value] || 0) + 1;
      }
    });

    return {
      ...question,
      responses: Object.entries(optionCounts).map(([option, count]) => ({ option, count })),
    };
  }

  if (question.type === 'rating') {
    const ratings = answers
      .map((answer) => Number(answer.answer))
      .filter((rating) => !Number.isNaN(rating));

    return {
      ...question,
      responses: ratings,
    };
  }

  return {
    ...question,
    responses: answers.map((answer) => answer.answer ?? ''),
  };
};

const computeFallbackAnalytics = (responses, questions) => ({
  total_responses: responses.length,
  questions: (questions || []).map((question) => computeQuestionAnalytics(responses, question)),
});

/**
 * Generates ML insights from processed responses
 * @param {Array} mlProcessedResponses - ML processed responses
 * @param {Array} questions - Form questions
 * @returns {Object} ML insights
 */
const generateMLInsights = (mlProcessedResponses, questions) => {
  const insights = {
    textAnalysis: [],
    sentimentSummary: { positive: 0, negative: 0, neutral: 0 },
    engagementMetrics: { totalWords: 0, avgResponseLength: 0, questionsCount: 0 },
    patterns: []
  };

  // Process text-based questions
  const textQuestions = questions.filter(q => ['short_text', 'long_text'].includes(q.type));

  textQuestions.forEach(question => {
    const questionInsights = {
      questionId: question.id,
      questionTitle: question.title,
      responseCount: 0,
      avgSentiment: 0,
      commonThemes: [],
      readabilityScore: 0
    };

    const questionResponses = mlProcessedResponses
      .filter(r => r[`${question.id}_ml`])
      .map(r => r[`${question.id}_ml`]);

    if (questionResponses.length > 0) {
      questionInsights.responseCount = questionResponses.length;

      // Calculate average sentiment
      const sentiments = questionResponses.map(r => r.features.sentimentScore);
      questionInsights.avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;

      // Calculate average readability
      const readabilityScores = questionResponses.map(r => r.features.readabilityScore);
      questionInsights.readabilityScore = readabilityScores.reduce((sum, s) => sum + s, 0) / readabilityScores.length;

      // Update overall sentiment summary
      questionResponses.forEach(response => {
        const sentiment = response.features.sentimentScore;
        if (sentiment > 0.1) insights.sentimentSummary.positive++;
        else if (sentiment < -0.1) insights.sentimentSummary.negative++;
        else insights.sentimentSummary.neutral++;

        insights.engagementMetrics.totalWords += response.features.wordCount;
      });
    }

    insights.textAnalysis.push(questionInsights);
  });

  // Calculate engagement metrics
  if (mlProcessedResponses.length > 0) {
    insights.engagementMetrics.avgResponseLength = insights.engagementMetrics.totalWords / mlProcessedResponses.length;
  }

  // Generate patterns and themes
  const allTokens = [];
  mlProcessedResponses.forEach(response => {
    textQuestions.forEach(question => {
      const mlData = response[`${question.id}_ml`];
      if (mlData && mlData.tokens) {
        allTokens.push(...mlData.tokens);
      }
    });
  });

  // Find most common words (simple frequency analysis)
  const wordFreq = {};
  allTokens.forEach(token => {
    wordFreq[token] = (wordFreq[token] || 0) + 1;
  });

  const commonWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  insights.patterns = commonWords;

  return insights;
};

const FormAnalytics = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [responses, setResponses] = useState([]);
  const [mlInsights, setMlInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar"); // ✅ Dropdown state
  const exportRef = useRef(null);

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
      setResponses(responsesRes.data || []);

      let analyticsPayload = null;
      try {
        const analyticsRes = await api.get(`/forms/${id}/analytics`);
        analyticsPayload = preprocessAnalyticsData(analyticsRes.data);
      } catch (analyticsError) {
        console.warn('Analytics endpoint fetch failed, using local fallback analytics', analyticsError);
        toast.error('Analytics endpoint unavailable. Using local fallback analytics.');
        analyticsPayload = computeFallbackAnalytics(responsesRes.data || [], formRes.data.questions || []);
      }

      setAnalytics(analyticsPayload);

      // Process responses for ML insights
      if (responsesRes.data && responsesRes.data.length > 0) {
        const mlProcessed = preprocessResponsesForML(responsesRes.data, formRes.data.questions || []);
        setMlInsights(generateMLInsights(mlProcessed, formRes.data.questions || []));
      }
    } catch (error) {
      // console.error("Analytics Error:", error);
      toast.error('Failed to load form analytics');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 text-sm">
        <p className="font-semibold text-slate-900">{item.name}</p>
        <p className="text-slate-600">{item.value} responses</p>
      </div>
    );
  };

  const escapeCsvValue = (value) => `"${String(value).replace(/"/g, '""')}"`;

  const downloadAnalyticsCSV = () => {
    const rows = [];
    rows.push(['Form Title', form.title]);
    rows.push(['Total Responses', totalResponses]);
    rows.push([]);

    questionsData.forEach((question) => {
      rows.push([question.title]);

      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)) {
        rows.push(['Option', 'Count']);
        (question.responses || []).forEach((response) => {
          rows.push([response.option, response.count]);
        });
      } else if (question.type === 'rating') {
        rows.push(['Rating', 'Count']);
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        (question.responses || []).forEach((rating) => {
          ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
        });
        Object.entries(ratingCounts).forEach(([rating, count]) => {
          rows.push([`${rating} Star`, count]);
        });
        rows.push(['Average', question.responses?.length ? (question.responses.reduce((sum, r) => sum + r, 0) / question.responses.length).toFixed(1) : '0']);
      } else {
        rows.push(['Response']);
        (question.responses || []).forEach((response) => {
          rows.push([response]);
        });
      }

      rows.push([]);
    });

    const csv = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, '_')}-analytics.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const escapePdfText = (text) => String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const createPdfBlob = (lines) => {
    const header = '%PDF-1.1\n';
    const contentLines = lines.map((line, index) => {
      const escaped = escapePdfText(line);
      return `(${escaped}) Tj${index < lines.length - 1 ? '\nT*' : ''}`;
    }).join('\n');

    const contentsBody = `BT\n/F1 12 Tf\n10 TL\n72 760 Td\n${contentLines}\nET\n`;
    const contentsLength = new TextEncoder().encode(contentsBody).length;

    const objects = [];
    let offset = header.length;

    const addObject = (objNum, body) => {
      const text = `${objNum} 0 obj\n${body}\nendobj\n`;
      objects.push({ objNum, text, offset });
      offset += new TextEncoder().encode(text).length;
    };

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, '<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    addObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
    addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    addObject(5, `<< /Length ${contentsLength} >>\nstream\n${contentsBody}endstream`);

    const xrefOffset = offset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    objects.forEach((obj) => {
      xref += `${obj.offset.toString().padStart(10, '0')} 00000 n \n`;
    });

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const fileContent = `${header}${objects.map((obj) => obj.text).join('')}${xref}${trailer}`;
    return new Blob([fileContent], { type: 'application/pdf' });
  };

  const downloadAnalyticsPDF = async () => {
    if (!exportRef.current) {
      toast.error('Unable to export PDF.');
      return;
    }

    try {
      const element = exportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#F8FDFF',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;

      pdf.addImage(imgData, 'PNG', margin, margin, renderWidth, renderHeight);
      pdf.save(`${form.title.replace(/\s+/g, '_')}-analytics.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF.');
    }
  };

  const getChartColors = (count) => CHART_COLORS.slice(0, Math.max(count, 1));

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

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
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

      <div ref={exportRef} className="max-w-7xl mx-auto px-4 py-12">

        {/* Title */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#003366] mb-2">
            {form.title}
          </h2>
          <p className="text-base text-slate-600">
            Analytics Overview - {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
          </p>
        </div>

        {/* Chart Type Selector and Export Actions */}
        {totalResponses > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap gap-3">
              {['bar', 'pie'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={chartType === type ? 'default' : 'outline'}
                  className={chartType === type ? 'bg-[#003366] text-white' : 'text-slate-700'}
                  onClick={() => setChartType(type)}
                >
                  {type === 'bar' ? 'Bar Chart' : 'Pie Chart'}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                className="text-slate-700"
                onClick={downloadAnalyticsCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-slate-700"
                onClick={downloadAnalyticsPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}

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

              // ------------------------
              // MULTIPLE CHOICE
              // ------------------------
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

                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                      {questionData.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {questionData.responses?.length || 0} answer options
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={340}>
                  {chartType === "bar" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: -12, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#475569' }} />
                      <Tooltip content={renderTooltip} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={getChartColors(chartData.length)[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={getChartColors(chartData.length)[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={renderTooltip} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                    </PieChart>
                  )}
                </ResponsiveContainer>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {chartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: getChartColors(chartData.length)[idx] }} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.value} responses</p>
                      </div>
                    </div>
                  ))}
                </div>
                  </Card>
                );
              }

              // ------------------------
              // RATING
              // ------------------------
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

                const colors = getChartColors(chartData.length);

                return (
                  <Card key={index} className="p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-[#003366]">{questionData.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">Average rating across all responses</p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        {avgRating} / 5
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={340}>
                      {chartType === "bar" ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: -12, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                          <YAxis tick={{ fill: '#475569' }} />
                          <Tooltip content={renderTooltip} />
                          <Legend verticalAlign="top" height={36} />
                          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                            {chartData.map((entry, i) => (
                              <Cell key={`cell-${i}`} fill={colors[i]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={4}
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.map((entry, i) => (
                              <Cell key={`cell-${i}`} fill={colors[i]} />
                            ))}
                          </Pie>
                          <Tooltip content={renderTooltip} />
                          <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                        </PieChart>
                      )}
                    </ResponsiveContainer>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {chartData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: colors[idx] }} />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.value} responses</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              }

              // ------------------------
              // TEXT RESPONSES
              // ------------------------
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

        {/* ML Insights Section */}
        {mlInsights && totalResponses > 0 && (
          <div className="mt-12">
            <Card className="p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-[#003366] mb-2">
                  AI-Powered Insights
                </h3>
                <p className="text-slate-600">
                  Automated analysis of response patterns and sentiment using machine learning
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Sentiment Analysis */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-800">Sentiment Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Positive</span>
                      <span className="text-sm font-medium text-green-600">
                        {mlInsights.sentimentSummary.positive}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Neutral</span>
                      <span className="text-sm font-medium text-slate-600">
                        {mlInsights.sentimentSummary.neutral}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Negative</span>
                      <span className="text-sm font-medium text-red-600">
                        {mlInsights.sentimentSummary.negative}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-800">Engagement Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total Words</span>
                      <span className="text-sm font-medium text-[#003366]">
                        {mlInsights.engagementMetrics.totalWords.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Avg Response Length</span>
                      <span className="text-sm font-medium text-[#003366]">
                        {mlInsights.engagementMetrics.avgResponseLength.toFixed(1)} words
                      </span>
                    </div>
                  </div>
                </div>

                {/* Common Themes */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-800">Common Themes</h4>
                  <div className="space-y-2">
                    {mlInsights.patterns.slice(0, 5).map((pattern, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">"{pattern.word}"</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-700">
                          {pattern.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Text Analysis */}
              {mlInsights.textAnalysis.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-slate-800 mb-4">Question Analysis</h4>
                  <div className="space-y-4">
                    {mlInsights.textAnalysis.map((analysis, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4">
                        <h5 className="font-medium text-slate-800 mb-2">{analysis.questionTitle}</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Responses:</span>
                            <span className="ml-2 font-medium">{analysis.responseCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Avg Sentiment:</span>
                            <span className={`ml-2 font-medium ${
                              analysis.avgSentiment > 0.1 ? 'text-green-600' :
                              analysis.avgSentiment < -0.1 ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              {analysis.avgSentiment > 0 ? '+' : ''}{analysis.avgSentiment.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Readability:</span>
                            <span className="ml-2 font-medium">{analysis.readabilityScore.toFixed(1)}/10</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormAnalytics;

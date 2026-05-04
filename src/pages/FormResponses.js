import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/apiMiddleware';
import { generateBFARHeaders, mapResponseToBFARColumns } from '../lib/preprocessing';

// ==================== UTILITY FUNCTIONS ====================
const isNoAnswer = (val) => !val || val === '' || val === '--' || (Array.isArray(val) && val.length === 0);

// Convert an answer to its option index (1‑based) if it's a multiple‑choice type
const getNumericAnswer = (answer, question) => {
  if (isNoAnswer(answer)) return '—';
  
  // For checkboxes (array) -> return comma‑separated indices
  if (question.type === 'checkboxes' && Array.isArray(answer)) {
    const indices = answer
      .map(opt => {
        const idx = (question.options || []).findIndex(o => o === opt);
        return idx !== -1 ? idx + 1 : null;
      })
      .filter(i => i !== null);
    return indices.length ? indices.join(',') : '—';
  }
  
  // For multiple‑choice and dropdown
  if (['multiple_choice', 'dropdown'].includes(question.type)) {
    const idx = (question.options || []).findIndex(o => o === answer);
    return idx !== -1 ? (idx + 1).toString() : answer; // fallback to raw if not found
  }
  
  // Rating, date, text – keep as is
  return answer;
};

// ==================== MAIN COMPONENT ====================
const FormResponses = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch form and responses
  const fetchData = useCallback(async () => {
    try {
      const [formRes, responsesRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/forms/${id}/responses`)
      ]);
      const fetchedForm = formRes.data;
      setForm(fetchedForm);
      setResponses(responsesRes.data);

      // Build sections (same logic as before)
      let formSections = [];
      if (fetchedForm.sections && fetchedForm.sections.length > 0) {
        formSections = fetchedForm.sections;
      } else if (fetchedForm.questions && fetchedForm.questions.length > 0) {
        const groupMap = new Map();
        fetchedForm.questions.forEach(q => {
          const sectionName = (q.section && q.section.trim()) ? q.section : 'Section 1';
          if (!groupMap.has(sectionName)) groupMap.set(sectionName, []);
          groupMap.get(sectionName).push(q);
        });
        formSections = Array.from(groupMap.entries()).map(([title, questions], idx) => ({
          id: `section_${idx}`,
          title,
          questions
        }));
      } else {
        formSections = [{ id: 'default', title: 'Section 1', questions: [] }];
      }
      setSections(formSections);
    } catch (error) {
      toast.error('Failed to fetch responses');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper to get raw answer for a question (used in table display)
  const getAnswerForQuestion = (response, question) => {
    const answersArray = response.answers || [];
    const matched = answersArray.find(a => a.question_id === question.id);
    if (matched && !isNoAnswer(matched.answer)) return matched.answer;
    const byTitle = answersArray.find(a => a.question_title === question.title);
    if (byTitle && !isNoAnswer(byTitle.answer)) return byTitle.answer;
    if (answersArray.length && typeof answersArray[0] !== 'object') {
      const allQs = sections.flatMap(s => s.questions);
      const idx = allQs.findIndex(q => q.id === question.id);
      if (idx >= 0 && idx < answersArray.length && !isNoAnswer(answersArray[idx])) return answersArray[idx];
    }
    return null;
  };

  // Format answer for table display (keeps original text)
  const formatAnswerForTable = (ans) => isNoAnswer(ans) ? '—' : (Array.isArray(ans) ? ans.join(', ') : String(ans));

  // ==================== CSV DOWNLOAD WITH PREPROCESSING ====================
  const downloadCSV = () => {
    if (responses.length === 0) {
      toast.error('No responses to download');
      return;
    }

    // All questions (flat list)
    const allQuestions = sections.flatMap(s => s.questions);
    
    // Identify the beneficiary question by its code "BENE"
    const beneQuestion = allQuestions.find(q => q.code === 'BENE');
    // All other questions that have a non‑empty code and are not the beneficiary question
    const validQuestions = allQuestions.filter(q => 
      q.code && q.code.trim() && q !== beneQuestion
    );
    
    if (validQuestions.length === 0 && !beneQuestion) {
      toast.error('No questions with a valid Question Code – cannot generate CSV');
      return;
    }

    // CSV header: "RESPONDENT" + each valid question's "CODE:TITLE"
    const headers = ['RESPONDENT', ...validQuestions.map(q => {
      const title = q.title.replace(/,/g, '').replace(/:/g, '').trim();
      return `${q.code}:${title}`;
    })];

    // Build rows
    const rows = responses.map((response, idx) => {
      // 1. Determine beneficiary prefix
      let prefix = '';
      if (beneQuestion) {
        const beneAnswer = getAnswerForQuestion(response, beneQuestion);
        // Assume first option is "Yes" (beneficiary) – adjust if your options differ
        const isBene = beneAnswer && (beneAnswer === 'Yes' || beneAnswer === 'Bene' || beneAnswer === beneQuestion.options?.[0]);
        prefix = isBene ? 'B-' : 'NB-';
      }
      
      // Respondent ID – adjust field name if your backend uses something else
      const rawRespondent = response.respondent_id || response.id || `R-${idx+1}`;
      const respondentId = prefix ? `${prefix}${rawRespondent}` : rawRespondent;
      
      // 2. For each valid question, get numeric‑converted answer
      const rowValues = validQuestions.map(q => {
        const rawAns = getAnswerForQuestion(response, q);
        const numericAns = getNumericAnswer(rawAns, q);
        return String(numericAns);
      });
      
      return [respondentId, ...rowValues];
    });

    // Generate CSV
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ];
    const csv = csvLines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, '_')}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };
  // ===============================================================

  // Table rendering (unchanged from working version)
  if (loading) return <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">Loading responses...</div>;
  if (!form) return null;

  const allQuestions = sections.flatMap(s => s.questions);
  const totalPages = Math.ceil(responses.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = responses.slice(start, start + rowsPerPage);
  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Indices for vertical borders
  let colIdx = 0;
  const sectionLastIndices = [];
  sections.forEach(section => {
    colIdx += section.questions.length;
    sectionLastIndices.push(colIdx - 1);
  });

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <nav className="bg-white border-b sticky top-0 z-50 p-4 flex justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4"/> Dashboard</Button>
        <Button variant="outline" onClick={downloadCSV} disabled={responses.length === 0}><Download className="mr-2 h-4 w-4"/> CSV</Button>
      </nav>
      <div className="max-w-full mx-auto px-4 py-12">
        <h2 className="text-3xl font-semibold text-[#003366]">{form.title}</h2>
        <p className="text-slate-600 mb-6">{responses.length} responses — grouped by section</p>
        {responses.length === 0 ? (
          <div className="text-center py-20">No responses yet</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select value={rowsPerPage.toString()} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => goToPage(currentPage-1)} disabled={currentPage===1}><ChevronLeft className="h-4 w-4"/></Button>
                  <Button size="sm" variant="outline" onClick={() => goToPage(currentPage+1)} disabled={currentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">#</th>
                      <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted At</th>
                      {sections.map(section => (
                        <th key={section.id} colSpan={section.questions.length} className="px-6 py-2 text-center text-sm font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">
                          {section.title}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {sections.flatMap((section, secIdx) =>
                        section.questions.map((q, qIdx) => {
                          const isLastCol = (secIdx === sections.length - 1 && qIdx === section.questions.length - 1);
                          return (
                            <th key={q.id} className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${!isLastCol ? 'border-r border-slate-300' : ''}`}>
                              <div className="max-w-xs truncate" title={q.title}>
                                Q{allQuestions.findIndex(qq => qq.id === q.id) + 1}: {q.title}
                              </div>
                            </th>
                          );
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {paginated.map((resp, idx) => {
                      const submittedAt = resp.submitted_at?._seconds ? new Date(resp.submitted_at._seconds*1000).toLocaleString() : 'No date';
                      const globalIdx = start + idx + 1;
                      return (
                        <tr key={resp.id} className="hover:bg-slate-50">
                          <td className="sticky left-0 bg-white px-6 py-4 text-sm border-r border-slate-200">{globalIdx}</td>
                          <td className="px-6 py-4 text-sm">{submittedAt}</td>
                          {allQuestions.map((q, colIdx) => {
                            const ans = getAnswerForQuestion(resp, q);
                            const hasRightBorder = sectionLastIndices.includes(colIdx);
                            return (
                              <td key={q.id} className={`px-6 py-4 text-sm max-w-xs truncate ${hasRightBorder ? 'border-r border-slate-200' : ''}`} title={formatAnswerForTable(ans)}>
                                {formatAnswerForTable(ans)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <Button size="sm" variant="outline" onClick={() => goToPage(currentPage-1)} disabled={currentPage===1}>Previous</Button>
                <span className="px-4 py-2">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => goToPage(currentPage+1)} disabled={currentPage===totalPages}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FormResponses;
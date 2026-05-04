import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/apiMiddleware';

const FormFill = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sections, setSections] = useState([]);

  const fetchForm = useCallback(async () => {
    try {
      const response = await api.get(`/forms/public/${id}`);
      const fetchedForm = response.data;
      setForm(fetchedForm);

      let formSections = [];

      if (fetchedForm.sections && fetchedForm.sections.length > 0) {
        // Use stored sections if available
        formSections = fetchedForm.sections;
        console.log('Using stored sections:', formSections);
      } else if (fetchedForm.questions && fetchedForm.questions.length > 0) {
        // Group by each question's 'section' property
        const sectionMap = new Map();
        fetchedForm.questions.forEach(q => {
          const secName = q.section && q.section.trim() ? q.section : 'Section 1';
          if (!sectionMap.has(secName)) sectionMap.set(secName, []);
          sectionMap.get(secName).push(q);
        });
        formSections = Array.from(sectionMap.entries()).map(([title, questions], idx) => ({
          id: `sec_${idx}`,
          title,
          questions
        }));
        console.log('Built sections from question.section:', formSections);
      } else {
        // No questions – create one empty section
        formSections = [{ id: 'default', title: 'Section 1', questions: [] }];
      }

      setSections(formSections);

      const initialAnswers = {};
      const allQuestions = formSections.flatMap(s => s.questions);
      allQuestions.forEach(q => {
        if (q.type === 'checkboxes') initialAnswers[q.id] = [];
        else if (q.type === 'rating') initialAnswers[q.id] = 3;
        else initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error(error);
      toast.error('Form not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleCheckboxChange = (questionId, option, checked) => {
    const current = answers[questionId] || [];
    if (checked) setAnswers({ ...answers, [questionId]: [...current, option] });
    else setAnswers({ ...answers, [questionId]: current.filter(opt => opt !== option) });
  };

  const validateCurrentSection = () => {
    const currentQs = sections[currentSectionIndex]?.questions || [];
    for (const q of currentQs) {
      if (q.required) {
        const ans = answers[q.id];
        const isEmpty = !ans || (Array.isArray(ans) && ans.length === 0);
        if (isEmpty) {
          toast.error(`Please answer: ${q.title}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!validateCurrentSection()) return;
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCurrentSection()) return;

    try {
      const existingResponses = await api.get(`/forms/public/${id}/responses`);
      const duplicate = (existingResponses.data || []).some(r =>
        (r.email || r.user?.email || r.full_name) === answers.email
      );
      if (duplicate) {
        toast.error('This email has already submitted a response for this survey.');
        return;
      }
    } catch (err) {}

    setSubmitting(true);
    try {
      const allQuestions = sections.flatMap(s => s.questions);
      const formattedAnswers = allQuestions.map(q => ({
        question_id: q.id,
        answer: answers[q.id]
      }));
      await api.post(`/forms/public/${id}/responses`, {
        email: answers.email,
        full_name: answers.full_name,
        age: answers.age,
        gender: answers.gender,
        answers: formattedAnswers
      });
      setSubmitted(true);
      toast.success('Response submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">Loading form...</div>;
  if (!form) return <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">Form not found</div>;
  if (submitted) return (
    <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-[#003366] mb-4">Thank You!</h2>
        <p className="text-lg text-slate-600 mb-2">Your response has been submitted successfully.</p>
        <p className="text-sm text-slate-500">You can close this page now.</p>
      </div>
    </div>
  );

  const current = sections[currentSectionIndex];
  const isFirst = currentSectionIndex === 0;
  const isLast = currentSectionIndex === sections.length - 1;

  return (
    <div className="min-h-screen bg-[#F8FDFF] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-[#00AEEF] rounded-lg flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#003366]">General Assessment e-Forms</h1>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-3">{form.title}</h2>
          {form.description && <p className="text-base text-slate-600 leading-relaxed">{form.description}</p>}
        </div>

        <div className="mb-4 text-sm text-slate-500">
          Section {currentSectionIndex + 1} of {sections.length}: <span className="font-semibold text-[#003366]">{current.title}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {current.questions.map((question, idx) => (
            <div key={question.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <Label className="text-lg font-semibold text-[#003366] mb-2 block">
                {idx + 1}. {question.title}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.description && <p className="text-sm text-slate-600 mb-4">{question.description}</p>}

              {question.type === 'short_text' && (
                <Input value={answers[question.id] || ''} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} required={question.required} />
              )}
              {question.type === 'long_text' && (
                <Textarea value={answers[question.id] || ''} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} rows={4} required={question.required} />
              )}
              {question.type === 'multiple_choice' && (
                <RadioGroup value={answers[question.id] || ''} onValueChange={v => setAnswers({ ...answers, [question.id]: v })} required={question.required}>
                  {question.options?.map((opt, oi) => (
                    <div key={oi} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value={opt} id={`${question.id}-${oi}`} />
                      <Label htmlFor={`${question.id}-${oi}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              {question.type === 'checkboxes' && (
                <div className="space-y-2">
                  {question.options?.map((opt, oi) => (
                    <div key={oi} className="flex items-center space-x-2">
                      <Checkbox id={`${question.id}-${oi}`} checked={answers[question.id]?.includes(opt)} onCheckedChange={c => handleCheckboxChange(question.id, opt, c)} />
                      <Label htmlFor={`${question.id}-${oi}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </div>
              )}
              {question.type === 'dropdown' && (
                <Select value={answers[question.id] || ''} onValueChange={v => setAnswers({ ...answers, [question.id]: v })} required={question.required}>
                  <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                  <SelectContent>
                    {question.options?.map((opt, oi) => <SelectItem key={oi} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {question.type === 'date' && (
                <Input type="date" value={answers[question.id] || ''} onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })} required={question.required} />
              )}
              {question.type === 'rating' && (
                <div className="flex space-x-4">
                  {[1,2,3,4,5].map(r => (
                    <button key={r} type="button" onClick={() => setAnswers({ ...answers, [question.id]: r })} className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all ${answers[question.id] === r ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#00AEEF]'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-between pt-4">
            <Button type="button" onClick={handlePrevious} disabled={isFirst} variant="outline" className="text-[#003366]"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
            {!isLast ? <Button type="button" onClick={handleNext} className="bg-[#003366] hover:bg-[#002244] text-white">Next <ChevronRight className="w-4 h-4 ml-2" /></Button> : <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-lg shadow-lg">{submitting ? 'Submitting...' : 'Submit Response'}</Button>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormFill;
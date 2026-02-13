import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FormFill = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await axios.get(`${API}/forms/public/${id}`);
      setForm(response.data);
      const initialAnswers = {};
      response.data.questions.forEach((q) => {
        if (q.type === 'checkboxes') {
          initialAnswers[q.id] = [];
        } else if (q.type === 'rating') {
          initialAnswers[q.id] = 3;
        } else {
          initialAnswers[q.id] = '';
        }
      });
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error('Form not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    const currentAnswers = answers[questionId] || [];
    if (checked) {
      setAnswers({ ...answers, [questionId]: [...currentAnswers, option] });
    } else {
      setAnswers({ ...answers, [questionId]: currentAnswers.filter((opt) => opt !== option) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const question of form.questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') {
          toast.error(`Please answer: ${question.title}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const formattedAnswers = form.questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id]
      }));

      await axios.post(`${API}/responses`, {
        form_id: id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <p className="text-slate-600">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#003366] mb-2">Form not found</h2>
          <p className="text-slate-600">This form may have been deleted or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <div className="text-center max-w-md" data-testid="submission-success">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#003366] mb-4">Thank You!</h2>
          <p className="text-lg text-slate-600 mb-2">Your response has been submitted successfully.</p>
          <p className="text-sm text-slate-500">You can close this page now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FDFF] py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-[#00AEEF] rounded-lg flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#003366]">BFAR e-Forms</h1>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-3">{form.title}</h2>
          {form.description && (
            <p className="text-base text-slate-600 leading-relaxed">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-fill">
          {form.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`question-${index}`}>
              <Label className="text-lg font-semibold text-[#003366] mb-2 block">
                {index + 1}. {question.title}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.description && (
                <p className="text-sm text-slate-600 mb-4">{question.description}</p>
              )}

              {question.type === 'short_text' && (
                <Input
                  data-testid={`answer-${index}`}
                  type="text"
                  placeholder="Your answer"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  className="form-input"
                  required={question.required}
                />
              )}

              {question.type === 'long_text' && (
                <Textarea
                  data-testid={`answer-${index}`}
                  placeholder="Your answer"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  className="form-input"
                  rows={4}
                  required={question.required}
                />
              )}

              {question.type === 'multiple_choice' && (
                <RadioGroup
                  data-testid={`answer-${index}`}
                  value={answers[question.id] || ''}
                  onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                  required={question.required}
                >
                  {question.options?.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value={option} id={`${question.id}-${oIndex}`} data-testid={`option-${index}-${oIndex}`} />
                      <Label htmlFor={`${question.id}-${oIndex}`} className="text-base font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === 'checkboxes' && (
                <div data-testid={`answer-${index}`} className="space-y-2">
                  {question.options?.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${oIndex}`}
                        data-testid={`option-${index}-${oIndex}`}
                        checked={answers[question.id]?.includes(option)}
                        onCheckedChange={(checked) => handleCheckboxChange(question.id, option, checked)}
                      />
                      <Label htmlFor={`${question.id}-${oIndex}`} className="text-base font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {question.type === 'dropdown' && (
                <Select
                  value={answers[question.id] || ''}
                  onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                  required={question.required}
                >
                  <SelectTrigger data-testid={`answer-${index}`} className="form-input">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.map((option, oIndex) => (
                      <SelectItem key={oIndex} value={option} data-testid={`option-${index}-${oIndex}`}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {question.type === 'date' && (
                <Input
                  data-testid={`answer-${index}`}
                  type="date"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  className="form-input"
                  required={question.required}
                />
              )}

              {question.type === 'rating' && (
                <div className="flex space-x-4" data-testid={`answer-${index}`}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      data-testid={`rating-${index}-${rating}`}
                      onClick={() => setAnswers({ ...answers, [question.id]: rating })}
                      className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all ${
                        answers[question.id] === rating
                          ? 'bg-[#003366] text-white border-[#003366]'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-[#00AEEF]'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              data-testid="submit-form-button"
              disabled={submitting}
              className="bg-[#003366] hover:bg-[#002244] text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Response'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormFill;

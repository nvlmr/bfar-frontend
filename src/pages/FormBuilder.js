import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Plus, Trash2, ArrowLeft, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { preprocessFormData } from '../lib/preprocessing';
import { api } from '../lib/apiMiddleware';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating Scale (1-5)' }
];

// Automatic code generation based on question position
// Auto-detects section and generates proper CSV format
const generateQuestionCode = (questionIndex, questionType, options = []) => {
  // Define section ranges (based on BFAR survey structure)
  // B: 0-4 (5 questions) - Demographics (2-digit: B01-B05)
  // C: 5-8 (4 questions) - Income (2-digit: C01-C04)
  // D: 9-30 (22 questions) - Assets (1-digit with sub-items: D1.1-D4.7)
  // E: 31-40 (10 questions) - Living Conditions (1-digit: E1-E5)
  // F: 41-48 (8 questions) - Properties (1-digit: F1-F2)
  // G: 49-60 (12 questions) - Insurance (1-digit: G1-G6)
  // H: 61-68 (8 questions) - Social Services (1-digit: H1-H8)
  // I: 69-80 (12 questions) - Fishing Experience (1-digit: I1-I8)
  // J: 81+ - Program Participation (1-digit with sub-items: J1-J7)
  
  const sectionRanges = [
    { section: 'B', start: 0, end: 4, useTwoDigit: true },      // B01-B05
    { section: 'C', start: 5, end: 8, useTwoDigit: true },      // C01-C04
    { section: 'D', start: 9, end: 30, useTwoDigit: false },     // D1.1-D4.7
    { section: 'E', start: 31, end: 40, useTwoDigit: false },    // E1-E5
    { section: 'F', start: 41, end: 48, useTwoDigit: false },   // F1-F2
    { section: 'G', start: 49, end: 60, useTwoDigit: false },   // G1-G6
    { section: 'H', start: 61, end: 68, useTwoDigit: false },   // H1-H8
    { section: 'I', start: 69, end: 80, useTwoDigit: false },    // I1-I8
    { section: 'J', start: 81, end: 999, useTwoDigit: false }   // J1-J7
  ];
  
  // Find which section this question belongs to
  const sectionInfo = sectionRanges.find(range => questionIndex >= range.start && questionIndex <= range.end);
  const section = sectionInfo ? sectionInfo.section : 'K';
  const useTwoDigit = sectionInfo ? sectionInfo.useTwoDigit : false;
  
  // Calculate position within section
  const positionInSection = sectionInfo ? questionIndex - sectionInfo.start + 1 : questionIndex - 81 + 1;
  
  let code;
  
  if (useTwoDigit) {
    // Sections B, C: B03, C01, etc.
    code = `${section}${positionInSection.toString().padStart(2, '0')}`;
  } else {
    // Sections D-J: D1.1, E1, F1.1, etc.
    // For sections with sub-items, we auto-generate sub-question numbers
    if (section === 'D' || section === 'J') {
      // These sections have sub-items
      const mainNum = Math.ceil(positionInSection / 2); // Every 2 questions = new main number
      const subNum = ((positionInSection - 1) % 2) + 1;  // Alternates between 1 and 2
      code = `${section}${mainNum}.${subNum}`;
    } else {
      // Simple sequential numbering
      code = `${section}${positionInSection}`;
    }
  }
  
  return code;
};

// Check if question should be skipped (long text, short text, names, addresses, comments)
const shouldSkipQuestion = (questionType, title = '') => {
  const skipTypes = ['short_text', 'long_text'];
  const skipKeywords = ['name', 'address', 'comment', 'specify', 'consent', 'text'];
  
  if (skipTypes.includes(questionType)) return true;
  
  const lowerTitle = title.toLowerCase();
  return skipKeywords.some(keyword => lowerTitle.includes(keyword));
};

// Generate all CSV headers for a form with question titles
// Format: CODE:Title (e.g., B03:Age, B05:Sex)
const generateCSVHeaders = (questions) => {
  const headers = [];
  
  questions.forEach((question) => {
    if (!shouldSkipQuestion(question.type, question.title) && question.code) {
      // Create sanitized title (remove special characters that could break CSV)
      const sanitizedTitle = question.title
        .replace(/,/g, '') // Remove commas
        .replace(/:/g, '') // Remove colons
        .trim();
      
      // Format: B03:Age or just B03 if no title
      const header = sanitizedTitle 
        ? `${question.code}:${sanitizedTitle}` 
        : question.code;
      
      headers.push(header);
    }
  });
  
  return headers.join(',');
};

const FormBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: []
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/${id}`);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to fetch form');
      navigate('/dashboard');
    } finally {
      setFetching(false);
    }
  };

  const addQuestion = () => {
    const questionIndex = formData.questions.length;
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      title: '',
      code: generateQuestionCode(questionIndex, 'multiple_choice', ['Option 1', 'Option 2']),
      description: '',
      required: false,
      options: ['Option 1', 'Option 2']
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value
      };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleTypeChange = (questionIndex, value) => {
    setFormData((prev) => {
      const updatedQuestions = [...prev.questions];
      const question = { ...updatedQuestions[questionIndex], type: value };

      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(value)) {
        question.options = question.options && question.options.length > 0 ? question.options : ['Option 1', 'Option 2'];
      } else {
        delete question.options;
      }

      // Regenerate code based on new position
      question.code = generateQuestionCode(questionIndex, value, question.options);

      updatedQuestions[questionIndex] = question;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const deleteQuestion = (index) => {
    setFormData((prev) => {
      const remainingQuestions = prev.questions.filter((_, i) => i !== index);
      // Regenerate codes for all remaining questions based on new positions
      const updatedQuestions = remainingQuestions.map((question, newIndex) => ({
        ...question,
        code: generateQuestionCode(newIndex, question.type, question.options)
      }));
      return { ...prev, questions: updatedQuestions };
    });
  };

  const addOption = (questionIndex) => {
    setFormData((prev) => {
      const updatedQuestions = [...prev.questions];
      const question = { ...updatedQuestions[questionIndex] };

      if (!question.options) {
        question.options = [];
      }
      question.options = [...question.options, ''];
      updatedQuestions[questionIndex] = question;

      return { ...prev, questions: updatedQuestions };
    });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setFormData((prev) => {
      const updatedQuestions = [...prev.questions];
      const question = { ...updatedQuestions[questionIndex] };
      question.options = [...(question.options || [])];
      question.options[optionIndex] = value;
      updatedQuestions[questionIndex] = question;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const deleteOption = (questionIndex, optionIndex) => {
    setFormData((prev) => {
      const updatedQuestions = [...prev.questions];
      const question = { ...updatedQuestions[questionIndex] };
      question.options = question.options.filter((_, i) => i !== optionIndex);
      updatedQuestions[questionIndex] = question;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleSave = async () => {
    const processedFormData = preprocessFormData(formData);

    if (!processedFormData.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (processedFormData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    for (let i = 0; i < processedFormData.questions.length; i++) {
      const q = processedFormData.questions[i];
      if (!q.title.trim()) {
        toast.error(`Question ${i + 1} is missing a title`);
        return;
      }
      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
        if (!q.options || q.options.length < 2 || q.options.some(opt => !opt.trim())) {
          toast.error(`Question ${i + 1} needs at least 2 valid options`);
          return;
        }
      }
    }

    // Generate CSV headers before saving
    const csvHeaders = generateCSVHeaders(processedFormData.questions);
    processedFormData.csvHeaders = csvHeaders;
    processedFormData.csvColumnCount = csvHeaders.split(',').length;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      if (!processedFormData.createdAt) {
        processedFormData.createdAt = now;
      }

      if (isEditMode) {
        await api.put(`/forms/${id}`, processedFormData);
        toast.success('Form updated successfully!');
      } else {
        const response = await api.post(`/forms`, processedFormData);
        toast.success('Form created successfully!');
        navigate(`/forms/${response.data.id}/edit`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#F8FDFF] flex items-center justify-center">
        <p className="text-slate-600">Loading form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FDFF]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
                data-testid="preview-csv-button"
                onClick={() => {
                  const headers = generateCSVHeaders(formData.questions);
                  alert('CSV Headers:\n' + headers);
                }}
                variant="outline"
                className="text-[#003366] border-[#003366]"
              >
                Preview CSV Headers
              </Button>
            </div>
            <Button
              data-testid="save-form-button"
              onClick={handleSave}
              disabled={loading}
              className="bg-[#003366] hover:bg-[#002244] text-white shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 mb-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="form-title" className="text-[#003366] text-lg font-semibold">Form Title</Label>
              <Input
                id="form-title"
                data-testid="form-title-input"
                type="text"
                placeholder="Enter form title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input mt-2 text-lg"
              />
            </div>
            <div>
              <Label htmlFor="form-description" className="text-[#003366]">Form Description (Optional)</Label>
              <Textarea
                id="form-description"
                data-testid="form-description-input"
                placeholder="Enter form description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input mt-2"
                rows={3}
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6" data-testid="questions-container">
          {formData.questions.map((question, qIndex) => (
            <Card key={question.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid={`question-card-${qIndex}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <Label className="text-[#003366]">Question {qIndex + 1}</Label>
                      <Input
                        data-testid={`question-title-${qIndex}`}
                        type="text"
                        placeholder="Enter your question"
                        value={question.title}
                        onChange={(e) => updateQuestion(qIndex, 'title', e.target.value)}
                        className="form-input mt-2"
                      />
                    </div>
                    <div className="w-48">
                      <Label className="text-[#003366]">Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value) => handleTypeChange(qIndex, value)}
                      >
                        <SelectTrigger data-testid={`question-type-${qIndex}`} className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Input
                      data-testid={`question-description-${qIndex}`}
                      type="text"
                      placeholder="Description (optional)"
                      value={question.description || ''}
                      onChange={(e) => updateQuestion(qIndex, 'description', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type) && (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600">Options</Label>
                      {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2">
                          <Input
                            data-testid={`question-${qIndex}-option-${oIndex}`}
                            type="text"
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="form-input flex-1"
                          />
                          <Button
                            data-testid={`delete-option-${qIndex}-${oIndex}`}
                            onClick={() => deleteOption(qIndex, oIndex)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        data-testid={`add-option-${qIndex}`}
                        onClick={() => addOption(qIndex)}
                        variant="outline"
                        size="sm"
                        className="text-[#00AEEF]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      data-testid={`question-required-${qIndex}`}
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(qIndex, 'required', checked)}
                    />
                    <Label className="text-sm text-slate-600">Required</Label>
                  </div>
                </div>

                <Button
                  data-testid={`delete-question-${qIndex}`}
                  onClick={() => deleteQuestion(qIndex)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Button
          data-testid="add-question-button"
          onClick={addQuestion}
          variant="outline"
          className="w-full mt-6 border-2 border-dashed border-slate-300 hover:border-[#00AEEF] hover:bg-blue-50 text-[#003366] py-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Question
        </Button>

        <div className="mt-8 flex justify-end">
          <Button
            data-testid="save-form-bottom-button"
            onClick={handleSave}
            disabled={loading}
            className="bg-[#003366] hover:bg-[#002244] text-white shadow-lg px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : isEditMode ? 'Update Form' : 'Create Form'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
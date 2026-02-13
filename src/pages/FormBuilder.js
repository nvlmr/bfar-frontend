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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating Scale (1-5)' }
];

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
      const response = await axios.get(`${API}/forms/${id}`);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to fetch form');
      navigate('/dashboard');
    } finally {
      setFetching(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: 'short_text',
      title: '',
      description: '',
      required: false,
      options: []
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...formData.questions];
    if (!updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = [];
    }
    updatedQuestions[questionIndex].options.push('');
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const deleteOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
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

    setLoading(true);
    try {
      if (isEditMode) {
        await axios.put(`${API}/forms/${id}`, formData);
        toast.success('Form updated successfully!');
      } else {
        const response = await axios.post(`${API}/forms`, formData);
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
                        onValueChange={(value) => {
                          updateQuestion(qIndex, 'type', value);
                          if (['multiple_choice', 'checkboxes', 'dropdown'].includes(value) && (!question.options || question.options.length === 0)) {
                            updateQuestion(qIndex, 'options', ['Option 1', 'Option 2']);
                          }
                        }}
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

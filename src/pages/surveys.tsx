import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  questions: Question[];
  responses: number;
  createdAt: string;
  endDate?: string;
}

interface Question {
  id: string;
  type: 'text' | 'rating' | 'multiple-choice' | 'checkbox';
  text: string;
  required: boolean;
  options?: string[];
}

const SURVEYS_KEY = 'dashboard_surveys';

const surveyTemplates = [
  {
    name: 'Sprint Retrospective',
    questions: [
      { type: 'rating', text: 'How satisfied are you with this sprint?', required: true },
      { type: 'text', text: 'What went well?', required: false },
      { type: 'text', text: 'What could be improved?', required: false },
      { type: 'multiple-choice', text: 'What was the biggest challenge?', options: ['Technical', 'Communication', 'Scope', 'Time'], required: true }
    ]
  },
  {
    name: 'Team Health Check',
    questions: [
      { type: 'rating', text: 'How is team morale?', required: true },
      { type: 'rating', text: 'How effective is communication?', required: true },
      { type: 'checkbox', text: 'What areas need attention?', options: ['Process', 'Tools', 'Collaboration', 'Workload'], required: false }
    ]
  }
];

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'analytics'>('list');
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SURVEYS_KEY);
    if (stored) {
      setSurveys(JSON.parse(stored));
    }
  }, []);

  const saveSurveys = (newSurveys: Survey[]) => {
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(newSurveys));
    setSurveys(newSurveys);
  };

  const createSurvey = (template?: any) => {
    const newSurvey: Survey = {
      id: Date.now().toString(),
      title: template ? template.name : 'New Survey',
      description: '',
      status: 'draft',
      questions: template ? template.questions.map((q: any, idx: number) => ({
        id: idx.toString(),
        type: q.type,
        text: q.text,
        required: q.required,
        options: q.options
      })) : [],
      responses: 0,
      createdAt: new Date().toISOString()
    };
    setEditingSurvey(newSurvey);
    setActiveTab('create');
  };

  const saveSurvey = () => {
    if (!editingSurvey) return;
    
    const updatedSurveys = editingSurvey.id && surveys.find(s => s.id === editingSurvey.id)
      ? surveys.map(s => s.id === editingSurvey.id ? editingSurvey : s)
      : [...surveys, editingSurvey];
    
    saveSurveys(updatedSurveys);
    setEditingSurvey(null);
    setActiveTab('list');
  };

  const deleteSurvey = (id: string) => {
    if (confirm('Are you sure you want to delete this survey?')) {
      saveSurveys(surveys.filter(s => s.id !== id));
    }
  };

  const toggleSurveyStatus = (id: string) => {
    const updatedSurveys = surveys.map(s => {
      if (s.id === id) {
        const newStatus = s.status === 'active' ? 'closed' : 'active';
        return { ...s, status: newStatus };
      }
      return s;
    });
    saveSurveys(updatedSurveys);
  };

  const addQuestion = () => {
    if (!editingSurvey) return;
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'text',
      text: '',
      required: false
    };
    setEditingSurvey({
      ...editingSurvey,
      questions: [...editingSurvey.questions, newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    if (!editingSurvey) return;
    setEditingSurvey({
      ...editingSurvey,
      questions: editingSurvey.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const removeQuestion = (questionId: string) => {
    if (!editingSurvey) return;
    setEditingSurvey({
      ...editingSurvey,
      questions: editingSurvey.questions.filter(q => q.id !== questionId)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Link href="/" className="inline-block bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded mb-4 font-medium transition">← Back to Home</Link>
          <h1 className="text-3xl font-bold text-slate-800">Survey Management</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-6 mb-6">
          <button
            className={`px-4 py-2 font-medium rounded-md ${
              activeTab === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('list')}
          >
            Surveys
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-md ${
              activeTab === 'create' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create Survey
          </button>
          <button
            className={`px-4 py-2 font-medium rounded-md ${
              activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {/* Survey List */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Surveys</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Use Template
                </button>
                <button
                  onClick={() => createSurvey()}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Create New
                </button>
              </div>
            </div>

            {showTemplates && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-3">Survey Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {surveyTemplates.map((template, idx) => (
                    <div key={idx} className="border rounded p-3 bg-white">
                      <h4 className="font-medium mb-2">{template.name}</h4>
                      <p className="text-sm text-slate-600 mb-3">{template.questions.length} questions</p>
                      <button
                        onClick={() => createSurvey(template)}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map(survey => (
                <div key={survey.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{survey.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      survey.status === 'active' ? 'bg-green-100 text-green-800' :
                      survey.status === 'closed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {survey.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">{survey.description}</p>
                  <div className="text-sm text-slate-500 mb-4">
                    <p>Questions: {survey.questions.length}</p>
                    <p>Responses: {survey.responses}</p>
                    <p>Created: {new Date(survey.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSurvey(survey);
                        setActiveTab('create');
                      }}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleSurveyStatus(survey.id)}
                      className="text-green-600 hover:underline text-sm"
                    >
                      {survey.status === 'active' ? 'Close' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteSurvey(survey.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create/Edit Survey */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editingSurvey?.id && surveys.find(s => s.id === editingSurvey.id) ? 'Edit Survey' : 'Create New Survey'}
              </h2>
              <button
                onClick={() => {
                  setEditingSurvey(null);
                  setActiveTab('list');
                }}
                className="text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>

            {editingSurvey && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Survey Title</label>
                  <input
                    type="text"
                    value={editingSurvey.title}
                    onChange={(e) => setEditingSurvey({...editingSurvey, title: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter survey title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editingSurvey.description}
                    onChange={(e) => setEditingSurvey({...editingSurvey, description: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Enter survey description"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium">Questions</label>
                    <button
                      onClick={addQuestion}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                    >
                      Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editingSurvey.questions.map((question, idx) => (
                      <div key={question.id} className="border rounded p-4 bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Question {idx + 1}</h4>
                          <button
                            onClick={() => removeQuestion(question.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Question Type</label>
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(question.id, { type: e.target.value as any })}
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="text">Text</option>
                              <option value="rating">Rating</option>
                              <option value="multiple-choice">Multiple Choice</option>
                              <option value="checkbox">Checkbox</option>
                            </select>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                              className="mr-2"
                            />
                            <label className="text-sm">Required</label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Question Text</label>
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter your question"
                          />
                        </div>

                        {(question.type === 'multiple-choice' || question.type === 'checkbox') && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                            <textarea
                              value={question.options?.join('\n') || ''}
                              onChange={(e) => updateQuestion(question.id, { 
                                options: e.target.value.split('\n').filter(opt => opt.trim()) 
                              })}
                              className="w-full border rounded px-3 py-2"
                              rows={3}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveSurvey}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                  >
                    Save Survey
                  </button>
                  <button
                    onClick={() => setEditingSurvey({...editingSurvey, status: 'active'})}
                    className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
                  >
                    Save & Activate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Survey Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Total Surveys</h3>
                <p className="text-2xl font-bold text-indigo-600">{surveys.length}</p>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Active Surveys</h3>
                <p className="text-2xl font-bold text-green-600">
                  {surveys.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="border rounded p-4">
                <h3 className="font-medium mb-2">Total Responses</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {surveys.reduce((sum, s) => sum + s.responses, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
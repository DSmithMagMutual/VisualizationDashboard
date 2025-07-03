import React, { useEffect, useState } from 'react';

interface Question {
  id: string;
  type: 'text' | 'rating' | 'multiple-choice' | 'checkbox';
  text: string;
  required: boolean;
  options?: string[];
}

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

const SURVEYS_KEY = 'dashboard_surveys';
const SURVEY_DISMISSED_KEY = 'survey_dismissed';

const SurveyPopup: React.FC = () => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [show, setShow] = useState(false);
  const [answers, setAnswers] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Only show if not dismissed or remind me later
    const dismissed = JSON.parse(localStorage.getItem(SURVEY_DISMISSED_KEY) || '{}');
    const stored = localStorage.getItem(SURVEYS_KEY);
    if (stored) {
      const surveys: Survey[] = JSON.parse(stored);
      const active = surveys.find(s => s.status === 'active' && !dismissed[s.id]);
      if (active) {
        setSurvey(active);
        setShow(true);
      }
    }
  }, []);

  if (!survey || !show) return null;

  const handleChange = (qid: string, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save response (for demo, just increment response count)
    const stored = localStorage.getItem(SURVEYS_KEY);
    if (stored) {
      const surveys: Survey[] = JSON.parse(stored);
      const updated = surveys.map(s =>
        s.id === survey.id ? { ...s, responses: (s.responses || 0) + 1 } : s
      );
      localStorage.setItem(SURVEYS_KEY, JSON.stringify(updated));
    }
    setSubmitted(true);
    setTimeout(() => setShow(false), 1500);
  };

  const handleNoThanks = () => {
    // Mark as dismissed in localStorage
    const dismissed = JSON.parse(localStorage.getItem(SURVEY_DISMISSED_KEY) || '{}');
    dismissed[survey.id] = true;
    localStorage.setItem(SURVEY_DISMISSED_KEY, JSON.stringify(dismissed));
    setShow(false);
  };

  const handleRemindLater = () => {
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative animate-fade-in">
        <button onClick={handleRemindLater} className="absolute top-2 right-2 text-slate-400 hover:text-slate-700">×</button>
        <h2 className="text-xl font-bold mb-2">{survey.title}</h2>
        <p className="text-slate-600 mb-4">{survey.description}</p>
        {submitted ? (
          <div className="text-green-600 font-medium text-center py-8">Thank you for your feedback!</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {survey.questions.map((q, idx) => (
              <div key={q.id} className="mb-2">
                <label className="block font-medium mb-1">{idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}</label>
                {q.type === 'text' && (
                  <input type="text" className="w-full border rounded px-3 py-2" required={q.required} value={answers[q.id] || ''} onChange={e => handleChange(q.id, e.target.value)} />
                )}
                {q.type === 'rating' && (
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button type="button" key={n} className={`px-3 py-1 rounded border ${answers[q.id] === n ? 'bg-indigo-600 text-white' : 'bg-white'}`} onClick={() => handleChange(q.id, n)}>{n}</button>
                    ))}
                  </div>
                )}
                {q.type === 'multiple-choice' && q.options && (
                  <select className="w-full border rounded px-3 py-2" required={q.required} value={answers[q.id] || ''} onChange={e => handleChange(q.id, e.target.value)}>
                    <option value="">Select...</option>
                    {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {q.type === 'checkbox' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <label key={opt} className="flex items-center gap-1">
                        <input type="checkbox" checked={answers[q.id]?.includes(opt) || false} onChange={e => {
                          const prev = answers[q.id] || [];
                          if (e.target.checked) handleChange(q.id, [...prev, opt]);
                          else handleChange(q.id, prev.filter((o: string) => o !== opt));
                        }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-3 mt-6">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Submit</button>
              <button type="button" onClick={handleNoThanks} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">No, thanks</button>
              <button type="button" onClick={handleRemindLater} className="bg-slate-100 text-slate-700 px-4 py-2 rounded hover:bg-slate-200">Remind me later</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SurveyPopup; 
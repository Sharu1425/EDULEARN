import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrainCircuit, Activity, CheckCircle2, AlertCircle, BarChart3, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

type Question = {
  q_number: number;
  dimension: string;
  question_text: string;
  option_a: string;
  option_b: string;
  transition?: string;
};

type SessionPhase = 'config' | 'active' | 'review';

export default function ThinkTraceSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as {
    topic?: string;
    difficulty?: string;
    subject_area?: string;
    question_count?: number;
  } | null;

  // Configuration State
  const [phase, setPhase] = useState<SessionPhase>('config');
  const [topic, setTopic] = useState(stateData?.topic || 'Programming Fundamentals');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState(stateData?.difficulty || 'medium');
  const [subjectArea] = useState(stateData?.subject_area || 'Computer Science');
  const [questionCount, setQuestionCount] = useState(stateData?.question_count || 5);

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [review, setReview] = useState<any>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const startSession = async () => {
    setIsLoading(true);
    setPhase('active');
    
    try {
      const finalTopic = topic === '__custom__' ? customTopic : topic;
      const params = {
        topic: finalTopic,
        difficulty,
        subject_area: subjectArea,
        question_count: questionCount
      };

      const res = await api.post('/api/thinktrace/start', params);
      setSessionId(res.data.id);
      
      const firstQ = res.data.questions[0];
      setCurrentQuestion(firstQ);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to start ThinkTrace session:', error);
      setIsLoading(false);
      setPhase('config');
      alert("Failed to connect to the ThinkTrace engine.");
    }
  };

  const handleAnswer = async (choice: 'A' | 'B') => {
    if (!sessionId || !currentQuestion || isAnswering) return;
    setIsAnswering(true);

    try {
      const res = await api.post(`/api/thinktrace/${sessionId}/answer`, {
        chosen_option: choice
      });

      if (res.data.status === 'completed') {
        setReview(res.data);
        setPhase('review');
      } else {
        const nextQ = res.data.questions[res.data.questions.length - 1];
        setCurrentQuestion(nextQ);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert("Error submitting answer.");
    } finally {
      setIsAnswering(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  const renderConfig = () => (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">ThinkTrace Interview</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-lg">Test your cognitive process through adaptive AI scenarios.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Interview Topic</label>
            <select 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border-zinc-300 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white px-4 py-3"
            >
              <option value="Programming Fundamentals">Programming Fundamentals</option>
              <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
              <option value="System Design">System Design</option>
              <option value="Web Development">Web Development</option>
              <option value="Machine Learning Basics">Machine Learning Basics</option>
              <option value="__custom__">Custom Topic...</option>
            </select>
            {topic === '__custom__' && (
              <input
                type="text"
                placeholder="e.g. Memory Management in C++"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full mt-3 border-zinc-300 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white px-4 py-3"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Difficulty</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-zinc-300 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white px-4 py-3"
              >
                <option value="easy">Foundational (Easy)</option>
                <option value="medium">Nuanced (Medium)</option>
                <option value="hard">System-Level (Hard)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Number of Questions</label>
              <select 
                value={questionCount} 
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full border-zinc-300 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white px-4 py-3"
              >
                <option value={5}>5 Questions (Quick Check)</option>
                <option value={10}>10 Questions (Standard)</option>
                <option value={15}>15 Questions (Deep Dive)</option>
                <option value={20}>20 Questions (Comprehensive)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={startSession}
            disabled={topic === '__custom__' && !customTopic.trim()}
            className="w-full py-4 mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            Start ThinkTrace Session
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: SESSION (card-based UI)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSession = () => {
    const finalTopic = topic === '__custom__' ? customTopic : topic;
    const progress = currentQuestion ? (currentQuestion.q_number / questionCount) * 100 : 0;

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex flex-col">
        {/* Header */}
        <div className="shrink-0 h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 md:px-8 justify-between bg-white dark:bg-[#09090b] sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => { setPhase('config'); setSessionId(null); setCurrentQuestion(null); }} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-xl transition">
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">ThinkTrace Engine</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{finalTopic} &bull; {difficulty}</p>
              </div>
            </div>
          </div>
          
          {currentQuestion && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Question {currentQuestion.q_number} / {questionCount}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                  <BrainCircuit className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">Initializing dynamic assessment...</p>
            </div>
          ) : currentQuestion ? (
            <div className="w-full max-w-4xl max-h-[85vh] flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden flex flex-col"
              >
                {/* Question Text */}
                <div className="p-6 md:p-10 border-b border-zinc-100 dark:border-zinc-800/50">
                  {currentQuestion.transition && (
                    <div className="mb-6 inline-block">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {currentQuestion.transition.includes('glitch') ? 'System Event' : 'Insight'}
                      </span>
                      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 italic">
                        {currentQuestion.transition}
                      </p>
                    </div>
                  )}
                  <h3 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-white leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>
                </div>

                {/* Options Layout */}
                <div className="p-6 md:p-10 bg-zinc-50/50 dark:bg-zinc-900/50 flex-1">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Option A */}
                    <button
                      disabled={isAnswering}
                      onClick={() => handleAnswer('A')}
                      className={cn(
                        "group relative flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-300 text-left h-full",
                        isAnswering 
                          ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50" 
                          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          A
                        </span>
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors"></div>
                      </div>
                      <p className="text-base text-zinc-700 dark:text-zinc-200 font-medium flex-1">
                        {currentQuestion.option_a}
                      </p>
                    </button>

                    {/* Option B */}
                    <button
                      disabled={isAnswering}
                      onClick={() => handleAnswer('B')}
                      className={cn(
                        "group relative flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-300 text-left h-full",
                        isAnswering 
                          ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50" 
                          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          B
                        </span>
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors"></div>
                      </div>
                      <p className="text-base text-zinc-700 dark:text-zinc-200 font-medium flex-1">
                        {currentQuestion.option_b}
                      </p>
                    </button>
                  </div>
                </div>
              </motion.div>
              
              {isAnswering && (
                <div className="mt-8 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-300 border-t-indigo-500 animate-spin"></div>
                  Analyzing response & adapting...
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-500 dark:text-zinc-400">Loading current cognitive step...</div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: REVIEW (Enriched Results)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderReview = () => {
    if (!review) return null;

    const textColor = (score: number) => {
      if (score >= 8) return 'text-emerald-500';
      if (score >= 5) return 'text-amber-500';
      return 'text-red-500';
    };

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: High-Level Score and Strategy */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Score Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl"></div>
                
                <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-6 relative z-10">Cognitive Skill Score</h2>
                
                <div className="relative inline-flex items-center justify-center w-48 h-48 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-zinc-100 dark:text-zinc-800 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
                    <circle 
                      className={`${textColor(review.skill_score)} stroke-current drop-shadow-lg`} 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      cx="50" cy="50" r="40" 
                      fill="transparent" 
                      strokeDasharray={`${(review.skill_score / 10) * 251.2} 251.2`} 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-5xl font-black ${textColor(review.skill_score)}`}>{review.skill_score}</span>
                    <span className="text-sm font-semibold text-zinc-400 mt-1 uppercase tracking-widest">Out of 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-2xl font-bold text-emerald-500">{review.strong_answers}</div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase mt-1">Strong</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-2xl font-bold text-red-500">{review.weak_answers}</div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase mt-1">Weak</div>
                  </div>
                </div>
              </div>

              {/* Overall Strategy */}
              {review.overall_strategy && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-100" /> Executive Strategy
                  </h3>
                  <p className="text-indigo-50 leading-relaxed font-medium">
                    {review.overall_strategy}
                  </p>
                </div>
              )}

              {/* Decision Pattern */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Decision Pattern
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
                  {review.decision_pattern}
                </p>
              </div>

            </div>

            {/* Right Column: Deep Feedbacks & Question Traces */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Key Strengths
                  </h3>
                  <div className="space-y-3">
                    {review.strengths?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" /> Conceptual Gaps
                  </h3>
                  <div className="space-y-3">
                    {review.conceptual_gaps?.map((gap: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="leading-relaxed">{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Improvements */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" /> Actionable Improvements
                </h3>
                <div className="grid gap-4">
                  {review.improvement_suggestions?.map((sug: string, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed pt-1 text-sm">
                        {sug}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Answer Trace: Question by Question */}
              {review.answer_trace && review.answer_trace.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> Question-by-Question Analysis
                  </h3>
                  <div className="space-y-4">
                    {review.answer_trace.map((trace: any, i: number) => {
                      const isStrong = trace.strength.toLowerCase().includes('strong');
                      return (
                        <div key={i} className="group overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-all hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md">
                          <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                            <div className={`shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${isStrong ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                              <span className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">Q{trace.q_number}</span>
                              <span className="text-sm font-black">{trace.chosen}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                  {trace.dimension}
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-widest ${isStrong ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {trace.strength}
                                </span>
                              </div>
                              {trace.explanation ? (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2">
                                  {trace.explanation}
                                </p>
                              ) : (
                                <p className="text-sm text-zinc-400 dark:text-zinc-600 italic mt-2">
                                  No AI explanation provided.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  };

  if (phase === 'config') return renderConfig();
  if (phase === 'active') return renderSession();
  if (phase === 'review') return renderReview();
  return null;
}

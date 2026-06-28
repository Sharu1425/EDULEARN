import { useState, useEffect } from 'react';
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
    autoStart?: boolean;
  } | null;

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

  // Auto-start when navigated from the assessment config page
  useEffect(() => {
    if (stateData?.autoStart) {
      startSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-3xl shadow-xl border border-border p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">ThinkTrace Interview</h1>
          <p className="text-muted-foreground mt-3 text-lg">Test your cognitive process through adaptive AI scenarios.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Interview Topic</label>
            <select 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border-border rounded-xl bg-background text-foreground px-4 py-3"
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
                className="w-full mt-3 border-border rounded-xl bg-background text-foreground px-4 py-3"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Difficulty</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-border rounded-xl bg-background text-foreground px-4 py-3"
              >
                <option value="easy">Foundational (Easy)</option>
                <option value="medium">Nuanced (Medium)</option>
                <option value="hard">System-Level (Hard)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Number of Questions</label>
              <select 
                value={questionCount} 
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full border-border rounded-xl bg-background text-foreground px-4 py-3"
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
            className="w-full py-4 mt-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="shrink-0 h-16 border-b border-border flex items-center px-4 md:px-8 justify-between bg-card sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => { setPhase('config'); setSessionId(null); setCurrentQuestion(null); }} className="hover:bg-muted p-2 rounded-xl transition">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-foreground leading-tight">ThinkTrace Engine</h2>
                <p className="text-xs text-muted-foreground">{finalTopic} &bull; {difficulty}</p>
              </div>
            </div>
          </div>
          
          {currentQuestion && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
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
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                  <BrainCircuit className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <p className="text-muted-foreground font-medium animate-pulse">Initializing dynamic assessment...</p>
            </div>
          ) : currentQuestion ? (
            <div className="w-full max-w-4xl max-h-[85vh] flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl shadow-xl shadow-e2 dark:shadow-none overflow-hidden flex flex-col"
              >
                {/* Question Text */}
                <div className="p-6 md:p-10 border-b border-border">
                  {currentQuestion.transition && (
                    <div className="mb-6 inline-block">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {currentQuestion.transition.includes('glitch') ? 'System Event' : 'Insight'}
                      </span>
                      <p className="mt-3 text-sm text-muted-foreground italic">
                        {currentQuestion.transition}
                      </p>
                    </div>
                  )}
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>
                </div>

                {/* Options Layout */}
                <div className="p-6 md:p-10 bg-muted/30 flex-1">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Option A */}
                    <button
                      disabled={isAnswering}
                      onClick={() => handleAnswer('A')}
                      className={cn(
                        "group relative flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-300 text-left h-full",
                        isAnswering 
                          ? "opacity-50 cursor-not-allowed border-border bg-muted/40" 
                          : "border-border bg-card hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded bg-muted text-foreground/80 font-bold group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          A
                        </span>
                        <div className="h-px flex-1 bg-muted group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors"></div>
                      </div>
                      <p className="text-base text-foreground/80 font-medium flex-1">
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
                          ? "opacity-50 cursor-not-allowed border-border bg-muted/40" 
                          : "border-border bg-card hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded bg-muted text-foreground/80 font-bold group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          B
                        </span>
                        <div className="h-px flex-1 bg-muted group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors"></div>
                      </div>
                      <p className="text-base text-foreground/80 font-medium flex-1">
                        {currentQuestion.option_b}
                      </p>
                    </button>
                  </div>
                </div>
              </motion.div>
              
              {isAnswering && (
                <div className="mt-8 text-center text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-border border-t-emerald-500 animate-spin"></div>
                  Analyzing response & adapting...
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Loading current cognitive step...</div>
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
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: High-Level Score and Strategy */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Score Card */}
              <div className="bg-card rounded-3xl p-8 border border-border text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
                
                <h2 className="text-xl font-bold text-foreground mb-6 relative z-10">Cognitive Skill Score</h2>
                
                <div className="relative inline-flex items-center justify-center w-48 h-48 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-muted stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
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
                    <span className="text-sm font-semibold text-muted-foreground mt-1 uppercase tracking-widest">Out of 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border">
                    <div className="text-2xl font-bold text-emerald-500">{review.strong_answers}</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Strong</div>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border">
                    <div className="text-2xl font-bold text-red-500">{review.weak_answers}</div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Weak</div>
                  </div>
                </div>
              </div>

              {/* Overall Strategy */}
              {review.overall_strategy && (
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-emerald-100" /> Executive Strategy
                  </h3>
                  <p className="text-emerald-50 leading-relaxed font-medium">
                    {review.overall_strategy}
                  </p>
                </div>
              )}

              {/* Decision Pattern */}
              <div className="bg-card rounded-3xl p-8 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" /> Decision Pattern
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {review.decision_pattern}
                </p>
              </div>

            </div>

            {/* Right Column: Deep Feedbacks & Question Traces */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-card rounded-3xl p-8 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Key Strengths
                  </h3>
                  <div className="space-y-3">
                    {review.strengths?.map((s: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-foreground/80">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-card rounded-3xl p-8 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" /> Conceptual Gaps
                  </h3>
                  <div className="space-y-3">
                    {review.conceptual_gaps?.map((gap: string, i: number) => (
                      <div key={i} className="flex gap-3 text-sm text-foreground/80">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="leading-relaxed">{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Improvements */}
              <div className="bg-card rounded-3xl p-8 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-info" /> Actionable Improvements
                </h3>
                <div className="grid gap-4">
                  {review.improvement_suggestions?.map((sug: string, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-info/15 text-info flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="text-foreground/80 font-medium leading-relaxed pt-1 text-sm">
                        {sug}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Answer Trace: Question by Question */}
              {review.answer_trace && review.answer_trace.length > 0 && (
                <div className="bg-card rounded-3xl p-8 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Question-by-Question Analysis
                  </h3>
                  <div className="space-y-4">
                    {review.answer_trace.map((trace: any, i: number) => {
                      const isStrong = trace.strength.toLowerCase().includes('strong');
                      return (
                        <div key={i} className="group overflow-hidden rounded-2xl border border-border bg-muted/40 transition-all hover:bg-muted/60 hover:shadow-md">
                          <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                            <div className={`shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${isStrong ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                              <span className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">Q{trace.q_number}</span>
                              <span className="text-sm font-black">{trace.chosen}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground/80 uppercase tracking-widest">
                                  {trace.dimension}
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-widest ${isStrong ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {trace.strength}
                                </span>
                              </div>
                              {trace.explanation ? (
                                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                  {trace.explanation}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic mt-2">
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

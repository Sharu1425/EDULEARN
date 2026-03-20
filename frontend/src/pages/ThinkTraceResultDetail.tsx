import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrainCircuit, Activity, CheckCircle2, AlertCircle, BarChart3, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import PageShell from '../components/ui/PageShell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ErrorState';

export default function ThinkTraceResultDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/thinktrace/${sessionId}`);
      setReview(res.data);
    } catch (err: any) {
      console.error('Failed to fetch ThinkTrace session details:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  const ringColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-rose-500';
  };

  if (loading) {
    return (
      <PageShell title="Loading Result" subtitle="Fetching your cognitive profile...">
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" text="Loading session details..." />
        </div>
      </PageShell>
    );
  }

  if (error || !review) {
    return (
      <PageShell title="Result Not Found" subtitle="Error loading session">
        <ErrorState title="Failed to Load" message={error || "Session not found."} onRetry={fetchSessionDetails} retryText="Retry" />
      </PageShell>
    );
  }

  const score = typeof review.skill_score === 'number' ? review.skill_score : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 text-foreground font-sans">
      <div className="max-w-6xl mx-auto space-y-6 mt-16 lg:mt-0">
        
        <button 
          onClick={() => navigate('/my-results')} 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Score Card */}
            <div className="bg-card rounded-3xl p-8 border border-border text-center relative overflow-hidden shadow-xl shadow-black/5">
              <h2 className="text-xl font-bold text-foreground mb-8">Cognitive Skill Score</h2>
              
              <div className="relative inline-flex items-center justify-center w-56 h-56 mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-muted/20 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
                  <circle 
                    className={`${ringColor(score)} stroke-current drop-shadow-sm`} 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    cx="50" cy="50" r="40" 
                    fill="transparent" 
                    strokeDasharray={`${(score / 10) * 251.2} 251.2`} 
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-6xl font-black ${ringColor(score)}`}>{score.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-widest">Out of 10</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{review.strong_answers || 0}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Strong</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{review.weak_answers || 0}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mt-1">Weak</div>
                </div>
              </div>
            </div>

            {/* Executive Strategy */}
            {review.overall_strategy && (
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit className="w-32 h-32 text-white" />
                 </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                  <BrainCircuit className="w-5 h-5 text-indigo-100" /> Executive Strategy
                </h3>
                <p className="text-indigo-50 leading-relaxed font-medium relative z-10 text-base">
                  {review.overall_strategy}
                </p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-card rounded-3xl p-8 border border-border h-full shadow-lg shadow-black/5">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Key Strengths
                </h3>
                <div className="space-y-4">
                  {review.strengths?.length > 0 ? (
                    review.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex gap-4 text-sm text-muted-foreground items-start">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="leading-relaxed text-foreground/80">{s}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No significant strengths identified yet.</p>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="bg-card rounded-3xl p-8 border border-border h-full shadow-lg shadow-black/5">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" /> Conceptual Gaps
                </h3>
                <div className="space-y-4">
                  {review.conceptual_gaps?.length > 0 ? (
                    review.conceptual_gaps.map((gap: string, i: number) => (
                      <div key={i} className="flex gap-4 text-sm text-muted-foreground items-start">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="leading-relaxed text-foreground/80">{gap}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No conceptual gaps identified yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actionable Improvements */}
            <div className="bg-card rounded-3xl p-8 border border-border shadow-lg shadow-black/5">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" /> Actionable Improvements
              </h3>
              <div className="grid gap-3">
                {review.improvement_suggestions?.length > 0 ? (
                  review.improvement_suggestions.map((sug: string, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div className="text-foreground/80 font-medium leading-relaxed text-sm">
                        {sug}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Not enough data for suggestions.</p>
                )}
              </div>
            </div>

            {/* Question-by-Question Analysis */}
            {review.answer_trace && review.answer_trace.length > 0 && (
              <div className="bg-card rounded-3xl p-8 border border-border shadow-lg shadow-black/5">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Question-by-Question Analysis
                </h3>
                <div className="space-y-4">
                  {review.answer_trace.map((trace: any, i: number) => {
                    const isStrong = trace.strength.toLowerCase().includes('strong');
                    return (
                      <div key={i} className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-5 hover:bg-muted/20 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start gap-5">
                          <div className={`shrink-0 flex items-center justify-center w-14 h-14 rounded-xl border ${isStrong ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                            <div className="text-center">
                              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Q{trace.q_number}</div>
                              <div className="text-lg font-black">{trace.chosen}</div>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-widest">
                                {trace.dimension}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${isStrong ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                {trace.strength}
                              </span>
                            </div>
                            
                            {trace.explanation ? (
                              <p className="text-sm text-foreground/70 leading-relaxed mt-2">
                                {trace.explanation}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground leading-relaxed mt-2 italic">
                                Detailed explanation not available.
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

            {/* Fallback if trace missing but questions exist */}
            {(!review.answer_trace || review.answer_trace.length === 0) && review.questions && (
              <div className="bg-card rounded-3xl p-8 border border-border shadow-lg shadow-black/5">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Questions Attempted
                </h3>
                <div className="space-y-4">
                  {review.questions.map((q: any, i: number) => {
                    const userQInfo = review.user_answers && review.user_answers[i];
                    return (
                        <div key={i} className="rounded-2xl border border-border/50 bg-muted/10 p-5">
                            <p className="font-semibold text-foreground/90 mb-3 text-sm leading-relaxed"><span className="text-indigo-500 mr-2">Q{i+1}.</span>{q.question || q.scenario}</p>
                            {userQInfo && (
                                <p className="text-xs bg-muted px-3 py-1.5 rounded border border-border/50 inline-block font-medium text-muted-foreground">Selected: {userQInfo}</p>
                            )}
                        </div>
                    )
                  })}
               </div>
               </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

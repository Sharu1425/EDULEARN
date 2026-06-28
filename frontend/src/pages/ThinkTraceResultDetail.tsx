import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrainCircuit, Activity, CheckCircle2, AlertCircle, BarChart3, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
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
    if (score >= 8) return 'text-success';
    if (score >= 5) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <LoadingSpinner size="lg" text="Loading session details..." />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState title="Failed to Load" message={error || "Session not found."} onRetry={fetchSessionDetails} retryText="Retry" />
      </div>
    );
  }

  const score = typeof review.skill_score === 'number' ? review.skill_score : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">

      <button
        onClick={() => navigate('/my-results')}
        className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Results
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Left Column */}
        <div className="space-y-6 lg:col-span-4">

          {/* Score Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-e2 dark:shadow-e2-dark">
            <h2 className="mb-8 font-heading text-xl font-bold text-foreground">Cognitive Skill Score</h2>

            <div className="relative mb-8 inline-flex h-56 w-56 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle className="stroke-current text-muted/30" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
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
                <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Out of 10</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div className="text-2xl font-bold text-success">{review.strong_answers || 0}</div>
                <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Strong</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                <div className="text-2xl font-bold text-destructive">{review.weak_answers || 0}</div>
                <div className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Weak</div>
              </div>
            </div>
          </div>

          {/* Executive Strategy */}
          {review.overall_strategy && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-8 text-white shadow-e3 dark:shadow-e3-dark">
              <div className="absolute right-0 top-0 p-8 opacity-10">
                <BrainCircuit className="h-32 w-32 text-white" />
              </div>
              <h3 className="relative z-10 mb-4 flex items-center gap-2 text-lg font-bold">
                <BrainCircuit className="h-5 w-5 text-white/90" /> Executive Strategy
              </h3>
              <p className="relative z-10 text-base font-medium leading-relaxed text-white/90">
                {review.overall_strategy}
              </p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-8">

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Strengths */}
            <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-e2 dark:shadow-e2-dark">
              <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" /> Key Strengths
              </h3>
              <div className="space-y-4">
                {review.strengths?.length > 0 ? (
                  review.strengths.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-4 text-sm">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      <span className="leading-relaxed text-foreground/80">{s}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No significant strengths identified yet.</p>
                )}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-e2 dark:shadow-e2-dark">
              <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" /> Conceptual Gaps
              </h3>
              <div className="space-y-4">
                {review.conceptual_gaps?.length > 0 ? (
                  review.conceptual_gaps.map((gap: string, i: number) => (
                    <div key={i} className="flex items-start gap-4 text-sm">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      <span className="leading-relaxed text-foreground/80">{gap}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No conceptual gaps identified yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Improvements */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-e2 dark:shadow-e2-dark">
            <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
              <BarChart3 className="h-5 w-5 text-info" /> Actionable Improvements
            </h3>
            <div className="grid gap-3">
              {review.improvement_suggestions?.length > 0 ? (
                review.improvement_suggestions.map((sug: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/10 text-sm font-bold text-info">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium leading-relaxed text-foreground/80">
                      {sug}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Not enough data for suggestions.</p>
              )}
            </div>
          </div>

          {/* Question-by-Question Analysis */}
          {review.answer_trace && review.answer_trace.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-8 shadow-e2 dark:shadow-e2-dark">
              <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <Activity className="h-5 w-5 text-success" /> Question-by-Question Analysis
              </h3>
              <div className="space-y-4">
                {review.answer_trace.map((trace: any, i: number) => {
                  const isStrong = trace.strength.toLowerCase().includes('strong');
                  return (
                    <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-5 transition-colors hover:bg-muted/20">
                      <div className="flex flex-col gap-5 md:flex-row md:items-start">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${isStrong ? 'border-success/20 bg-success/10 text-success' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
                          <div className="text-center">
                            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest opacity-70">Q{trace.q_number}</div>
                            <div className="text-lg font-black">{trace.chosen}</div>
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {trace.dimension}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isStrong ? 'text-success' : 'text-destructive'}`}>
                              {trace.strength}
                            </span>
                          </div>

                          {trace.explanation ? (
                            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                              {trace.explanation}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
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
            <div className="rounded-3xl border border-border bg-card p-8 shadow-e2 dark:shadow-e2-dark">
              <h3 className="mb-6 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <Activity className="h-5 w-5 text-success" /> Questions Attempted
              </h3>
              <div className="space-y-4">
                {review.questions.map((q: any, i: number) => {
                  const userQInfo = review.user_answers && review.user_answers[i];
                  return (
                    <div key={i} className="rounded-2xl border border-border/50 bg-muted/10 p-5">
                      <p className="mb-3 text-sm font-semibold leading-relaxed text-foreground/90"><span className="mr-2 text-primary">Q{i + 1}.</span>{q.question || q.scenario}</p>
                      {userQInfo && (
                        <p className="inline-block rounded border border-border/50 bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Selected: {userQInfo}</p>
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
  );
}

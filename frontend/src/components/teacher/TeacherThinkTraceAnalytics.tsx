import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, TrendingUp, BrainCircuit } from "lucide-react";
import api from "../../utils/api";

export default function TeacherThinkTraceAnalytics() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get("/api/thinktrace/teacher/analytics");
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch ThinkTrace analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-zinc-500">Loading ThinkTrace insights...</div>;
  }

  if (!data || data.total_sessions === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-8 text-center border border-zinc-200 dark:border-zinc-800">
        <BrainCircuit className="w-12 h-12 text-zinc-400 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No ThinkTrace Data Yet</h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto">
          Students need to complete ThinkTrace adaptive interviews before analytics can be compiled.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overview Stats */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Average Skill Score</h3>
        </div>
        <div className="text-4xl font-bold text-zinc-900 dark:text-white mt-2">
          {data.average_score} <span className="text-base font-normal text-zinc-500">/ 10</span>
        </div>
        <p className="text-sm text-zinc-500 mt-2">Based on {data.total_sessions} completed sessions</p>
      </div>

      {/* Common Conceptual Gaps */}
      <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" /> 
          Most Common Conceptual Gaps
        </h3>
        {data.common_gaps && data.common_gaps.length > 0 ? (
          <div className="space-y-3">
            {data.common_gaps.map((gap: any, i: number) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10">
                <span className="text-sm font-medium text-red-800 dark:text-red-300">{gap.gap}</span>
                <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-red-900/30 text-red-600 rounded-md">
                  {gap.count} students
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-500 py-4 text-center">No common gaps identified yet.</div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="md:col-span-3 bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Recent Completed Sessions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
            <thead className="text-xs text-zinc-700 uppercase bg-zinc-50 dark:bg-zinc-800/50 dark:text-zinc-300 rounded-t-lg">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Student ID</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Skill Score</th>
                <th className="px-4 py-3 rounded-tr-lg">Primary Learning Style</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_sessions?.map((session: any) => (
                <tr key={session.id} className="border-b dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{session.student_id.substring(0, 8)}...</td>
                  <td className="px-4 py-3">{session.topic} ({session.difficulty})</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                      session.skill_score >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      session.skill_score >= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      {session.skill_score} / 10
                    </span>
                  </td>
                  <td className="px-4 py-3">{session.learning_style?.primary || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

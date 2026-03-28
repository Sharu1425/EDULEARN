export interface User {
  _id: string;
  id?: string;
  username?: string;
  email: string;
  name?: string;
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  is_admin?: boolean;
  role?: string;
  has_face_descriptor?: boolean;
}

export interface Question {
  question: string;
  options?: string[]; // Optional for coding questions
  answer: string | number;
  correct_answer?: number; // Index of correct answer
  explanation?: string;
  id?: string;
  difficulty?: string;
  topic?: string;
  type?: string; // e.g. 'mcq' or 'coding'
  reference_solution?: string;
}

export interface AssessmentConfig {
  topic: string;
  qnCount: number;
  difficulty: string;
}

export interface TestResult {
  id: string;
  score: number;
  total_questions: number;
  topic: string;
  difficulty: string;
  date: string;
  percentage?: number;
  time_taken?: number;
}

export interface DetailedTestResult {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  questions: Question[];
  user_answers: string[];
  topic: string;
  difficulty: string;
  time_taken?: number;
  explanations?: Array<{ questionIndex: number; explanation: string }>;
  date: string;
  percentage: number;
  correct_answers: number;
  incorrect_answers: number;
}

export interface QuestionReview {
  question_index: number;
  question: string;
  options: string[];
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  explanation?: string;
  reference_solution?: string;
}

export interface DetailedResultResponse {
  success: boolean;
  result: DetailedTestResult;
  question_reviews: QuestionReview[];
}

export interface Analytics {
  total_assessments: number;
  average_score: number;
  total_questions: number;
  topics: string[];
  recent_results: TestResult[];
  topic_stats: Record<string, {
    count: number;
    total_score: number;
    total_questions: number;
    average_score: number;
  }>;
}

export interface ApiResponse<T = any> {
success: boolean;
data?: T;
error?: string;
message?: string;
}

// Coding Platform Types
export interface CodingProblem {
id: string;
title: string;
description: string;
topic: string;
difficulty: 'easy' | 'medium' | 'hard';
constraints: string[];
examples: ProblemExample[];
test_cases?: CodingTestCase[];
hints: string[];
tags: string[];
expected_complexity: {
  time: string;
  space: string;
};
code_templates?: {
  [language: string]: string;
};
success_rate: number;
average_time?: number;
last_attempt?: {
  status: string;
  submitted_at: string;
  execution_time?: number;
  attempts: number;
};
}

export interface ProblemExample {
input: string;
output: string;
explanation: string;
}

export interface CodingTestCase {
input: Record<string, any>;
output: any;
description?: string;
}

export interface CodeExecution {
success: boolean;
results: CodingTestResult[];
execution_time: number;
memory_used: number;
error_message?: string;
}

export interface CodingTestResult {
  test_case_index?: number;
  passed: boolean;
  output: any;
  expected?: any;
  input?: any;
  test_input?: any;
  error?: string;
  execution_time: number;
  memory_used: number;
  debug_info?: {
    status: string;
    status_id: number;
    raw_output: string;
    raw_error: string;
    compile_output: string;
    comparison: {
      match: boolean;
      type: string;
      message: string;
      actual?: string;
      expected?: string;
      line_analysis?: {
        actual_lines: string[];
        expected_lines: string[];
        first_difference: {
          line_number: number;
          actual_line?: string;
          expected_line?: string;
          message?: string;
        };
      };
    };
    execution_details: {
      time: string;
      memory: number;
      wall_time: string;
      exit_code: number;
      exit_signal: number;
    };
  };
}

export interface CodingSolution {
id: string;
problem_id: string;
problem_title?: string;
problem_topic?: string;
problem_difficulty?: string;
code: string;
language: string;
status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error';
execution_time?: number;
memory_used?: number;
test_results: CodingTestResult[];
ai_feedback?: AIFeedback;
code_quality_score?: number;
submitted_at: string;
attempts: number;
}

export interface AIFeedback {
correctness: {
  score: number;
  issues: string[];
  suggestions: string[];
};
performance: {
  time_complexity: string;
  space_complexity: string;
  efficiency_score: number;
  optimizations: string[];
};
code_quality: {
  readability_score: number;
  maintainability_score: number;
  best_practices: string[];
  code_smells: string[];
};
alternative_approaches: AlternativeApproach[];
learning_points: string[];
overall_score: number;
next_steps: string[];
}

export interface AlternativeApproach {
approach: string;
description: string;
pros: string[];
cons: string[];
complexity: string;
}

export interface CodingSession {
id: string;
problem_id: string;
start_time: string;
end_time?: string;
total_time?: number;
keystrokes: number;
lines_of_code: number;
compilation_attempts: number;
test_runs: number;
hints_used: number;
final_status?: string;
}

export interface CodingAnalytics {
total_problems_solved: number;
total_problems_attempted: number;
success_rate: number;
average_time_per_problem: number;
preferred_language?: string;
skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
strong_topics: string[];
weak_topics: string[];
improvement_areas: string[];
learning_path: LearningPathItem[];
coding_streak: number;
longest_streak: number;
problems_by_difficulty: Record<string, number>;
problems_by_topic: Record<string, number>;
recent_activity: RecentActivity[];
}

export interface LearningPathItem {
topic: string;
difficulty: string;
problems_count: number;
estimated_time: string;
prerequisites: string[];
learning_resources: string[];
}

export interface RecentActivity {
problem_id: string;
status: string;
language: string;
submitted_at: string;
execution_time?: number;
}

export interface LearningPath {
current_skill_assessment: {
  level: string;
  strengths: string[];
  weaknesses: string[];
  confidence_score: number;
};
learning_objectives: LearningObjective[];
recommended_topics: LearningPathItem[];
practice_schedule: {
  daily_problems: number;
  weekly_goals: string;
  review_schedule: string;
  difficulty_progression: string;
};
improvement_areas: ImprovementArea[];
milestone_tracking: Milestone[];
}

export interface LearningObjective {
goal: string;
priority: 'high' | 'medium' | 'low';
estimated_weeks: number;
success_criteria: string[];
}

export interface ImprovementArea {
area: string;
current_level: string;
target_level: string;
action_plan: string[];
}

export interface Milestone {
milestone: string;
target_date: string;
progress_indicators: string[];
}

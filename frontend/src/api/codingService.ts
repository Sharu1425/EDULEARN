/**
 * Coding service for handling coding problems and solutions
 */
import api from '../utils/api';

export interface CodingProblem {
  id: string;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  constraints: string[];
  examples: any[];
  hints: string[];
  tags: string[];
  expected_complexity: {
    time: string;
    space: string;
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

export interface CodingAnalytics {
  total_problems_solved: number;
  total_problems_attempted: number;
  success_rate: number;
  average_time_per_problem: number;
  preferred_language?: string;
  skill_level: string;
  strong_topics: string[];
  weak_topics: string[];
  improvement_areas: string[];
  learning_path: string[];
  coding_streak: number;
  longest_streak: number;
  problems_by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  problems_by_topic: Record<string, number>;
  recent_activity: Array<{
    problem_id: string;
    status: string;
    language: string;
    submitted_at: string;
    execution_time?: number;
  }>;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  test_cases: any[];
  time_limit?: number;
  memory_limit?: number;
}

export interface CodeExecutionResponse {
  success: boolean;
  results: Array<{
    test_case_index: number;
    passed: boolean;
    output: any;
    expected: any;
    test_input: any;
    error?: string;
    execution_time: number;
    memory_used: number;
  }>;
  execution_time: number;
  memory_used: number;
  error_message?: string;
}

export interface CodingSolutionSubmit {
  problem_id: string;
  code: string;
  language: string;
}

export interface CodingSolutionResponse {
  id: string;
  problem_id: string;
  problem_title: string;
  problem_topic: string;
  problem_difficulty: string;
  problem_description?: string;
  reference_solution?: string;
  code: string;
  language: string;
  status: string;
  execution_time?: number;
  memory_used?: number;
  test_results: any[];
  ai_feedback?: any;
  code_quality_score?: number;
  submitted_at: string;
  attempts: number;
}

export interface CodingSessionStart {
  problem_id: string;
  language: string;
}

export interface CodingSessionUpdate {
  keystrokes?: number;
  lines_of_code?: number;
  compilation_attempts?: number;
  test_runs?: number;
  hints_used?: number;
}

export interface LearningPath {
  current_skill_assessment: {
    level: string;
    strengths: string[];
    weaknesses: string[];
    confidence_score: number;
  };
  learning_objectives: Array<{
    goal: string;
    priority: string;
    estimated_weeks: number;
    success_criteria: string[];
  }>;
  recommended_topics: Array<{
    topic: string;
    difficulty: string;
    problems_count: number;
    estimated_time: string;
    prerequisites: string[];
    learning_resources: string[];
  }>;
  practice_schedule: {
    daily_problems: number;
    weekly_goals: string;
    review_schedule: string;
    difficulty_progression: string;
  };
  improvement_areas: Array<{
    area: string;
    current_level: string;
    target_level: string;
    action_plan: string[];
  }>;
  milestone_tracking: Array<{
    milestone: string;
    target_date: string;
    progress_indicators: string[];
  }>;
}

class CodingService {
  /**
   * Generate a new coding problem using AI
   */
  async generateProblem(request: {
    topic: string;
    difficulty: string;
    user_skill_level?: string;
    focus_areas?: string[];
    avoid_topics?: string[];
    timestamp?: number;
    session_id?: string;
  }): Promise<{ success: boolean; problem: CodingProblem }> {
    const response = await api.post('/api/coding/problems/generate', request);
    return response.data;
  }

  /**
   * Get coding problems with optional filtering
   */
  async getProblems(params?: {
    topic?: string;
    difficulty?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ success: boolean; problems: CodingProblem[]; total: number }> {
    const response = await api.get('/api/coding/problems', { params });
    return response.data;
  }

  /**
   * Get a specific coding problem by ID
   */
  async getProblem(problemId: string): Promise<{ success: boolean; problem: CodingProblem }> {
    const response = await api.get(`/api/coding/problems/${problemId}`);
    return response.data;
  }

  /**
   * Execute code with test cases
   */
  async executeCode(request: CodeExecutionRequest): Promise<{ success: boolean; execution_result: CodeExecutionResponse }> {
    const response = await api.post('/api/coding/execute', request);
    return response.data;
  }

  /**
   * Submit a coding solution
   */
  async submitSolution(solution: CodingSolutionSubmit): Promise<{ success: boolean; submission: CodingSolutionResponse }> {
    const response = await api.post('/api/coding/test-code', solution);
    return response.data;
  }

  /**
   * Get a specific submission by ID
   */
  async getSubmission(submissionId: string): Promise<{ success: boolean; submission: CodingSolutionResponse }> {
    const response = await api.get(`/api/coding/submissions/${submissionId}`);
    return response.data;
  }

  /**
   * Start a new coding session
   */
  async startSession(sessionData: CodingSessionStart): Promise<{ success: boolean; session_id: string }> {
    const response = await api.post('/api/coding/sessions/start', sessionData);
    return response.data;
  }

  /**
   * Update coding session data
   */
  async updateSession(sessionId: string, updateData: CodingSessionUpdate): Promise<{ success: boolean }> {
    const response = await api.put(`/api/coding/sessions/${sessionId}`, updateData);
    return response.data;
  }

  /**
   * End a coding session
   */
  async endSession(sessionId: string, finalStatus: string): Promise<{ success: boolean; session_summary: any }> {
    const response = await api.post(`/api/coding/sessions/${sessionId}/end`, { final_status: finalStatus });
    return response.data;
  }

  /**
   * Get coding analytics for the user
   */
  async getAnalytics(): Promise<{ success: boolean; analytics: CodingAnalytics }> {
    const response = await api.get('/api/coding/analytics');
    return response.data;
  }

  /**
   * Generate personalized learning path using AI
   */
  async generateLearningPath(): Promise<{ success: boolean; learning_path: LearningPath }> {
    const response = await api.post('/api/coding/analytics/learning-path');
    return response.data;
  }
}

export default new CodingService();

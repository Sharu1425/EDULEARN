/**
 * Assessment service for handling assessments and questions
 */
import api from '../utils/api';

export interface AssessmentConfig {
  topic: string;
  qnCount: number;
  difficulty: string;
}

export interface AssessmentCreate {
  title: string;
  topic: string;
  difficulty: string;
  description?: string;
  time_limit?: number;
  max_attempts?: number;
  type?: string;
}

export interface AssessmentResponse {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  description?: string;
  time_limit?: number;
  max_attempts: number;
  question_count: number;
  created_by: string;
  created_at: string;
  status: string;
  type: string;
}

export interface QuestionCreate {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  points?: number;
}

export interface QuestionResponse {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  points: number;
}

export interface CodingQuestionCreate {
  title: string;
  description: string;
  problem_statement: string;
  constraints: string[];
  examples: any[];
  test_cases: any[];
  hidden_test_cases: any[];
  expected_complexity: {
    time: string;
    space: string;
  };
  hints: string[];
  points: number;
  time_limit: number;
  memory_limit: number;
}

export interface CodingQuestionResponse {
  id: string;
  title: string;
  description: string;
  problem_statement: string;
  constraints: string[];
  examples: any[];
  hints: string[];
  points: number;
  time_limit: number;
  memory_limit: number;
  test_cases: any[];
}

export interface AssessmentSubmission {
  answers: number[];
  time_taken: number;
}

export interface AssessmentResult {
  id: string;
  assessment_id: string;
  student_id: string;
  student_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken: number;
  submitted_at: string;
  attempt_number: number;
}

export interface CodingSubmission {
  question_id: string;
  code: string;
  language: string;
}

export interface CodingSubmissionResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  status: string;
  execution_time: number;
  memory_used: number;
  test_results: any[];
  score: number;
  max_score: number;
  submitted_at: string;
}

class AssessmentService {
  /**
   * Set assessment configuration
   */
  async setAssessmentConfig(config: AssessmentConfig): Promise<any> {
    const response = await api.post('/api/topic', config);
    return response.data;
  }

  /**
   * Get assessment configuration
   */
  async getAssessmentConfig(): Promise<any> {
    const response = await api.get('/api/topic');
    return response.data;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(assessment: AssessmentCreate): Promise<AssessmentResponse> {
    const response = await api.post('/api/assessments/', assessment);
    return response.data;
  }

  /**
   * Get all assessments for teacher
   */
  async getTeacherAssessments(): Promise<AssessmentResponse[]> {
    const response = await api.get('/api/assessments/');
    return response.data;
  }

  /**
   * Get available assessments for student
   */
  async getAvailableAssessments(): Promise<AssessmentResponse[]> {
    const response = await api.get('/api/assessments/student/available');
    return response.data;
  }

  /**
   * Add question to assessment
   */
  async addQuestion(assessmentId: string, question: QuestionCreate): Promise<QuestionResponse> {
    const response = await api.post(`/api/assessments/${assessmentId}/questions`, question);
    return response.data;
  }

  /**
   * Add coding question to assessment
   */
  async addCodingQuestion(assessmentId: string, question: CodingQuestionCreate): Promise<CodingQuestionResponse> {
    const response = await api.post(`/api/assessments/${assessmentId}/coding-questions`, question);
    return response.data;
  }

  /**
   * Generate questions using AI
   */
  async generateAIQuestions(assessmentId: string, generationData: {
    question_type: string;
    topic: string;
    difficulty: string;
    question_count: number;
    title: string;
  }): Promise<{ success: boolean; generated_count: number; message: string }> {
    const response = await api.post(`/api/assessments/${assessmentId}/ai-generate-questions`, generationData);
    return response.data;
  }

  /**
   * Publish assessment
   */
  async publishAssessment(assessmentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/assessments/${assessmentId}/publish`);
    return response.data;
  }

  /**
   * Assign assessment to batches
   */
  async assignToBatches(assessmentId: string, batchIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/assessments/${assessmentId}/assign-batches`, batchIds);
    return response.data;
  }

  /**
   * Get assessment questions
   */
  async getAssessmentQuestions(assessmentId: string): Promise<QuestionResponse[]> {
    const response = await api.get(`/api/assessments/${assessmentId}/questions`);
    return response.data;
  }

  /**
   * Submit assessment
   */
  async submitAssessment(assessmentId: string, submission: AssessmentSubmission): Promise<AssessmentResult> {
    const response = await api.post(`/api/assessments/${assessmentId}/submit`, submission);
    return response.data;
  }

  /**
   * Submit coding solution
   */
  async submitCodingSolution(assessmentId: string, submission: CodingSubmission): Promise<CodingSubmissionResponse> {
    // Transform submission to match teacher assessment API format
    const teacherSubmission = {
      problem_id: submission.question_id,
      code: submission.code,
      language: submission.language,
    };
    const response = await api.post(`/api/teacher/assessments/${assessmentId}/submit-coding-student`, teacherSubmission);
    return response.data;
  }

  /**
   * Get assessment details
   */
  async getAssessmentDetails(assessmentId: string): Promise<any> {
    const response = await api.get(`/api/assessments/${assessmentId}/details`);
    return response.data;
  }

  /**
   * Get assessment leaderboard
   */
  async getAssessmentLeaderboard(assessmentId: string): Promise<any> {
    const response = await api.get(`/api/assessments/${assessmentId}/leaderboard`);
    return response.data;
  }

  /**
   * Get student notifications
   */
  async getStudentNotifications(): Promise<any[]> {
    const response = await api.get('/api/assessments/notifications');
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/assessments/notifications/${notificationId}/read`);
    return response.data;
  }

  /**
   * Get specific assessment result by ID
   */
  async getAssessmentResult(resultId: string): Promise<any> {
    const response = await api.get(`/api/teacher/assessments/results/${resultId}`);
    return response.data;
  }
}

export default new AssessmentService();

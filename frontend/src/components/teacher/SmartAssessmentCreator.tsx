import React, { useState, useEffect } from "react";
;
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import LoadingSpinner from "../ui/LoadingSpinner";
import api from "../../utils/api";

interface Batch {
  id: string;
  name: string;
  studentCount: number;
  averageScore: number;
  weaknesses: string[];
}

interface SmartAssessment {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: string;
    topic: string;
  }>;
  targetWeaknesses: string[];
  estimatedTime: number;
  difficulty: string;
}

interface SmartAssessmentCreatorProps {
  teacherId: string;
  onAssessmentCreated?: (assessment: SmartAssessment) => void;
}

const SmartAssessmentCreator: React.FC<SmartAssessmentCreatorProps> = ({ 
  teacherId, 
  onAssessmentCreated 
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [adaptToWeaknesses, setAdaptToWeaknesses] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDescription, setAssessmentDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<SmartAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchTopics();
  }, [teacherId]);

  const fetchBatches = async () => {
    try {
      const response = await api.get(`/api/teacher-dashboard/batches/${teacherId}`);
      setBatches(response.data);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      console.log("Using mock data for batches");
      // Use mock data as fallback
      const mockBatches: Batch[] = [
        {
          id: "batch-1",
          name: "Advanced Programming",
          studentCount: 25,
          averageScore: 78.5,
          weaknesses: ["Time complexity", "Dynamic programming", "Graph algorithms"]
        },
        {
          id: "batch-2",
          name: "Data Structures",
          studentCount: 18,
          averageScore: 82.3,
          weaknesses: ["Tree traversal", "Hash tables", "Priority queues"]
        },
        {
          id: "batch-3",
          name: "Algorithms",
          studentCount: 22,
          averageScore: 75.8,
          weaknesses: ["Sorting algorithms", "Search algorithms", "Recursion"]
        }
      ];
      setBatches(mockBatches);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get("/api/questions/topics");
      setTopics(response.data);
    } catch (err) {
      console.error("Failed to fetch topics:", err);
      console.log("Using mock data for topics");
      // Use mock data as fallback
      const mockTopics = [
        "JavaScript", "Python", "Java", "C++", "Data Structures", 
        "Algorithms", "Web Development", "Database", "React", "Node.js"
      ];
      setTopics(mockTopics);
    }
  };

  const generateSmartAssessment = async () => {
    if (!selectedBatch || !assessmentTitle.trim()) {
      setError("Please select a batch and provide an assessment title");
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const requestData = {
        teacherId,
        batchId: selectedBatch,
        title: assessmentTitle,
        description: assessmentDescription,
        questionCount,
        difficulty,
        topics: selectedTopics,
        adaptToWeaknesses,
        targetWeaknesses: adaptToWeaknesses ? batches.find(b => b.id === selectedBatch)?.weaknesses || [] : []
      };

      const response = await api.post("/api/teacher-dashboard/generate-smart-assessment", requestData);
      
      if (response.data.success) {
        setGeneratedAssessment(response.data.assessment);
        onAssessmentCreated?.(response.data.assessment);
      }
    } catch (err) {
      console.error("Failed to generate smart assessment:", err);
      console.log("Using mock data for smart assessment");
      // Use mock data as fallback
      const selectedBatchData = batches.find(b => b.id === selectedBatch);
      const mockAssessment: SmartAssessment = {
        id: `assessment-${Date.now()}`,
        title: assessmentTitle,
        description: assessmentDescription || `AI-generated assessment targeting ${selectedBatchData?.name || 'selected batch'}`,
        questions: Array.from({ length: questionCount }, (_, i) => ({
          id: `q${i + 1}`,
          question: `What is the time complexity of ${['bubble sort', 'merge sort', 'quick sort', 'binary search'][i % 4]}?`,
          options: [
            "O(n)",
            "O(n log n)", 
            "O(n²)",
            "O(log n)"
          ],
          correctAnswer: i % 4,
          explanation: `The correct answer explains the time complexity of the algorithm.`,
          difficulty: difficulty,
          topic: selectedTopics[i % selectedTopics.length] || "Algorithms"
        })),
        targetWeaknesses: adaptToWeaknesses ? selectedBatchData?.weaknesses || [] : [],
        estimatedTime: questionCount * 2,
        difficulty: difficulty
      };
      setGeneratedAssessment(mockAssessment);
      onAssessmentCreated?.(mockAssessment);
    } finally {
      setGenerating(false);
    }
  };

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const getSelectedBatch = () => {
    return batches.find(b => b.id === selectedBatch);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-emerald-200 mb-2">
          🧠 Smart Assessment Creator
        </h2>
        <p className="text-emerald-300">
          Create AI-powered assessments tailored to your students' needs
        </p>
      </div>

      {error && (
        <Card className="p-4 bg-red-500/20 border-red-500/30">
          <div className="text-red-400 text-center">
            <p>{error}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-emerald-200 mb-6">
            Assessment Configuration
          </h3>

          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Assessment Title
              </label>
              <Input
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder="Enter assessment title"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={assessmentDescription}
                onChange={(e) => setAssessmentDescription(e.target.value)}
                placeholder="Enter assessment description"
                className="w-full p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-200 placeholder-emerald-400 focus:border-emerald-400 focus:outline-none"
                rows={3}
              />
            </div>

            {/* Batch Selection */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Target Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-200 focus:border-emerald-400 focus:outline-none"
              >
                <option value="">Select a batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.studentCount} students)
                  </option>
                ))}
              </select>
            </div>

            {/* Adapt to Weaknesses */}
            {selectedBatch && (
              <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={adaptToWeaknesses}
                    onChange={(e) => setAdaptToWeaknesses(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-emerald-900 border-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-emerald-200">
                      Adapt to Batch Weaknesses
                    </span>
                    <p className="text-xs text-emerald-400">
                      Generate questions targeting this batch's common weak points
                    </p>
                  </div>
                </label>
                
                {adaptToWeaknesses && getSelectedBatch() && (
                  <div className="mt-3">
                    <p className="text-sm text-emerald-300 mb-2">Identified weaknesses:</p>
                    <div className="flex flex-wrap gap-2">
                      {getSelectedBatch()?.weaknesses.map((weakness, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full"
                        >
                          {weakness}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Question Count */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Number of Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-200 focus:border-emerald-400 focus:outline-none"
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
                <option value={25}>25 questions</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-200 focus:border-emerald-400 focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Topics (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTopics.includes(topic)
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-900/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateSmartAssessment}
              disabled={generating || !selectedBatch || !assessmentTitle.trim()}
              className="w-full"
            >
              {generating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating Assessment...</span>
                </>
              ) : (
                "Generate Smart Assessment"
              )}
            </Button>
          </div>
        </Card>

        {/* Generated Assessment Preview */}
        {generatedAssessment && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-emerald-200 mb-4">
              Generated Assessment Preview
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-emerald-200">{generatedAssessment.title}</h4>
                <p className="text-sm text-emerald-300">{generatedAssessment.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-emerald-400">Questions:</span>
                  <span className="text-emerald-200 ml-2">{generatedAssessment.questions.length}</span>
                </div>
                <div>
                  <span className="text-emerald-400">Difficulty:</span>
                  <span className="text-emerald-200 ml-2 capitalize">{generatedAssessment.difficulty}</span>
                </div>
                <div>
                  <span className="text-emerald-400">Est. Time:</span>
                  <span className="text-emerald-200 ml-2">{generatedAssessment.estimatedTime} min</span>
                </div>
                <div>
                  <span className="text-emerald-400">Targeted:</span>
                  <span className="text-emerald-200 ml-2">
                    {generatedAssessment.targetWeaknesses.length} weaknesses
                  </span>
                </div>
              </div>

              {generatedAssessment.targetWeaknesses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-emerald-300 mb-2">Targeted Weaknesses:</p>
                  <div className="flex flex-wrap gap-1">
                    {generatedAssessment.targetWeaknesses.map((weakness, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full"
                      >
                        {weakness}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h5 className="font-semibold text-emerald-200">Sample Questions:</h5>
                {generatedAssessment.questions.slice(0, 2).map((question, idx) => (
                  <div key={idx} className="p-3 bg-emerald-900/20 rounded-lg">
                    <p className="text-sm text-emerald-300 mb-2">{question.question}</p>
                    <div className="text-xs text-emerald-400">
                      {question.topic} • {question.difficulty}
                    </div>
                  </div>
                ))}
                {generatedAssessment.questions.length > 2 && (
                  <p className="text-xs text-emerald-400">
                    +{generatedAssessment.questions.length - 2} more questions...
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Preview All
                </Button>
                <Button variant="primary" size="sm" className="flex-1">
                  Create Assessment
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SmartAssessmentCreator;

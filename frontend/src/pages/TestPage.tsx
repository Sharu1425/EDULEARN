import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TestInterface from '../components/TestInterface';
import AssessmentResults from '../components/AssessmentResults';

const TestPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestComplete = (testResult: any) => {
    setResult(testResult);
    setShowResults(true);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    navigate('/dashboard');
  };

  if (!assessmentId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Invalid Assessment</h2>
          <p className="text-muted-foreground">Assessment ID is missing.</p>
        </div>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <AssessmentResults
        result={result}
        onClose={handleCloseResults}
      />
    );
  }

  return (
    <TestInterface
      assessmentId={assessmentId}
      onComplete={handleTestComplete}
    />
  );
};

export default TestPage;

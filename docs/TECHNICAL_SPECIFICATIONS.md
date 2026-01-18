# Technical Specifications - Simplified

## 1. Flask Route for Quiz Submission

```python
from flask import Flask, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import pymongo
from bson import ObjectId

app = Flask(__name__)
db = pymongo.MongoClient("mongodb://localhost:27017/")["edulearn"]

@app.route('/api/assessments/<assessment_id>/submit', methods=['POST'])
@jwt_required()
def submit_quiz(assessment_id):
    """Submit quiz answers and get score"""
    try:
        # Get current user
        user_id = get_jwt_identity()
        data = request.get_json()
        answers = data.get('answers', [])
        time_taken = data.get('time_taken', 0)
        
        # Validate assessment
        if not ObjectId.is_valid(assessment_id):
            return jsonify({"error": "Invalid assessment ID"}), 400
        
        assessment = db.assessments.find_one({"_id": ObjectId(assessment_id)})
        if not assessment:
            return jsonify({"error": "Assessment not found"}), 404
        
        # Check if already submitted
        if db.assessment_submissions.find_one({"assessment_id": assessment_id, "student_id": user_id}):
            return jsonify({"error": "Already submitted"}), 400
        
        # Calculate score
        questions = assessment.get("questions", [])
        correct = 0
        for i, question in enumerate(questions):
            if i < len(answers) and answers[i] == question.get("correct_answer", -1):
                correct += 1
        
        percentage = (correct / len(questions)) * 100 if questions else 0
        
        # Save submission
        submission = {
            "assessment_id": assessment_id,
            "student_id": user_id,
            "answers": answers,
            "score": correct,
            "percentage": round(percentage, 2),
            "time_taken": time_taken,
            "submitted_at": datetime.utcnow()
        }
        result = db.assessment_submissions.insert_one(submission)
        
        return jsonify({
            "success": True,
            "score": correct,
            "total": len(questions),
            "percentage": round(percentage, 2)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

---

## 2. SQL CREATE TABLE Statements

### Users Table
```sql
CREATE TABLE Users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Student fields
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
);
```

### Questions Table
```sql
CREATE TABLE Questions (
    id VARCHAR(255) PRIMARY KEY,
    assessment_id VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer INT NOT NULL,
    explanation TEXT,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    topic VARCHAR(255),
    points INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_assessment_id (assessment_id),
    INDEX idx_difficulty (difficulty),
    INDEX idx_topic (topic)
);
```

### Recommendations Table
```sql
CREATE TABLE Recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type ENUM('topic', 'resource', 'learning_path') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority INT DEFAULT 5,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    recommended_topics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);
```

---

## 3. Pseudocode for AI Evaluation Function

```pseudocode
FUNCTION evaluateAnswers(questions, userAnswers):
    /*
    Evaluates quiz answers and provides feedback
    */
    
    correctCount = 0
    totalQuestions = LENGTH(questions)
    topicScores = {}
    difficultyScores = {easy: 0, medium: 0, hard: 0}
    
    // Evaluate each question
    FOR EACH question IN questions:
        questionIndex = INDEX_OF(question)
        userAnswer = userAnswers[questionIndex]
        correctAnswer = question.correct_answer
        
        // Check if correct
        IF userAnswer == correctAnswer:
            correctCount = correctCount + 1
            difficultyScores[question.difficulty] += 1
        
        // Track topic performance
        topic = question.topic
        IF topic NOT IN topicScores:
            topicScores[topic] = {correct: 0, total: 0}
        topicScores[topic].total += 1
        IF userAnswer == correctAnswer:
            topicScores[topic].correct += 1
    
    // Calculate percentage
    percentage = (correctCount / totalQuestions) * 100
    
    // Find strengths and weaknesses
    strengths = []
    weaknesses = []
    
    FOR EACH topic IN topicScores:
        accuracy = (topicScores[topic].correct / topicScores[topic].total) * 100
        IF accuracy >= 80:
            strengths.APPEND(topic)
        ELSE IF accuracy < 60:
            weaknesses.APPEND(topic)
    
    // Generate feedback
    feedback = ""
    IF percentage >= 90:
        feedback = "Excellent performance!"
    ELSE IF percentage >= 75:
        feedback = "Good work, keep it up!"
    ELSE IF percentage >= 60:
        feedback = "Average performance, review weak topics"
    ELSE:
        feedback = "Needs improvement, focus on basics"
    
    RETURN {
        score: correctCount,
        total: totalQuestions,
        percentage: percentage,
        strengths: strengths,
        weaknesses: weaknesses,
        feedback: feedback,
        difficultyBreakdown: difficultyScores
    }
END FUNCTION
```

---

## 4. Recommendation Algorithm Function

```pseudocode
FUNCTION generateRecommendations(userId, userHistory):
    /*
    Generates personalized learning recommendations
    */
    
    recommendations = []
    
    // Calculate topic performance
    topicScores = {}
    FOR EACH result IN userHistory:
        FOR EACH question IN result.questions:
            topic = question.topic
            IF topic NOT IN topicScores:
                topicScores[topic] = {correct: 0, total: 0}
            topicScores[topic].total += 1
            IF question.isCorrect:
                topicScores[topic].correct += 1
    
    // Find weak topics
    weakTopics = []
    FOR EACH topic IN topicScores:
        accuracy = (topicScores[topic].correct / topicScores[topic].total) * 100
        IF accuracy < 60:
            weakTopics.APPEND({
                topic: topic,
                score: accuracy,
                priority: "high"
            })
    
    // Generate recommendations
    FOR EACH weakTopic IN weakTopics:
        recommendations.APPEND({
            type: "topic_review",
            title: f"Improve {weakTopic.topic}",
            description: f"Your score: {weakTopic.score}%",
            priority: "high",
            action: f"Review {weakTopic.topic} concepts and practice exercises"
        })
    
    // Check for upcoming assessments
    upcomingAssessments = GET_UPCOMING_ASSESSMENTS(userId)
    FOR EACH assessment IN upcomingAssessments:
        preparationScore = CALCULATE_PREPARATION(assessment, userHistory)
        IF preparationScore < 70:
            recommendations.APPEND({
                type: "assessment_preparation",
                title: f"Prepare for {assessment.title}",
                priority: "high",
                action: "Review topics and take practice tests"
            })
    
    // Sort by priority
    SORT recommendations BY priority DESC
    
    RETURN recommendations[0:10]  // Top 10
END FUNCTION

FUNCTION CALCULATE_PREPARATION(assessment, userHistory):
    /*
    Calculates how prepared user is for assessment
    */
    assessmentTopics = assessment.topics
    userTopicScores = CALCULATE_TOPIC_SCORES(userHistory)
    
    totalScore = 0
    FOR EACH topic IN assessmentTopics:
        IF topic IN userTopicScores:
            totalScore += userTopicScores[topic].averageScore
    
    RETURN totalScore / LENGTH(assessmentTopics)
END FUNCTION
```

---

## Summary

**Flask Route:** Handles quiz submission, validates answers, calculates score, saves to database

**SQL Tables:** 
- Users: Store user accounts and performance
- Questions: Store quiz questions with options and answers
- Recommendations: Store personalized learning suggestions

**AI Evaluation:** Compares answers, calculates scores, identifies strengths/weaknesses, generates feedback

**Recommendations:** Analyzes user history, finds weak topics, suggests what to study next, prioritizes recommendations

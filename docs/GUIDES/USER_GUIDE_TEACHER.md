# Teacher User Guide

Welcome to EDULEARN! This comprehensive guide will help you effectively manage your students, create assessments, and track learning outcomes.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Batch Management](#batch-management)
4. [Student Management](#student-management)
5. [Creating Assessments](#creating-assessments)
6. [AI Question Generation](#ai-question-generation)
7. [Managing Assessments](#managing-assessments)
8. [Viewing Results](#viewing-results)
9. [Analytics & Reports](#analytics--reports)
10. [Communication](#communication)
11. [Best Practices](#best-practices)

---

## Getting Started

### 1. Account Setup

Your teacher account should be created by the system administrator. You'll receive an email with:
- Login credentials
- Platform URL
- Initial setup instructions

**First Login**:
1. Go to the platform login page
2. Enter your email and temporary password
3. Change your password immediately
4. Complete your profile information
5. Set your preferences

### 2. Understanding Your Dashboard

After logging in, you'll see:
- **Quick Stats**: Students, batches, assessments, avg performance
- **Recent Activity**: Latest student submissions
- **Upcoming Deadlines**: Scheduled assessments
- **Batch Overview**: All your batches at a glance

### 3. Navigation

**Main Menu**:
- **Dashboard**: Overview and quick stats
- **Students**: Manage students
- **Batches**: Manage student groups
- **Assessments**: Create and manage assessments
- **Coding**: Manage coding challenges
- **Results**: View student results
- **Analytics**: Detailed performance analytics

---

## Dashboard Overview

### Quick Stats Cards

**Total Students**:
- Count of all students across your batches
- Click to view student list

**Total Batches**:
- Number of active batches
- Click to view batch list

**Assessments Created**:
- Count of all your assessments
- Includes drafts and published

**Average Performance**:
- Average score across all students
- Calculated from recent submissions

### Recent Activity

**Student Submissions**:
- Latest assessment submissions
- Student name, assessment, score, time
- Quick access to detailed results

**Filters**:
- Filter by batch
- Filter by date range
- Filter by score range

### Upcoming Deadlines

- Assessments nearing deadline
- Number of pending submissions
- Quick action buttons

---

## Batch Management

### 1. Creating a Batch

**Steps**:
1. Go to "Batches" → "Create New Batch"
2. Fill in batch details:
   - **Batch Name**: e.g., "Computer Science 2024 A"
   - **Description**: Brief description
   - **Subject**: Primary subject
   - **Grade/Level**: Student level
   - **Academic Year**: e.g., "2023-2024"
   - **Start Date**: When batch begins
   - **End Date**: When batch concludes
3. Click "Create Batch"

**Best Practices**:
- Use clear, descriptive names
- Include year and section in name
- Add detailed description
- Set realistic date ranges

### 2. Viewing Batches

**Batch List View**:
- See all your batches
- Batch name and student count
- Creation date and status
- Quick action buttons

**Batch Details**:
Click on a batch to view:
- Full batch information
- Student list
- Assigned assessments
- Performance statistics

### 3. Managing Batch Students

**Adding Students**:

**Method 1: Individual Add**
1. Open batch details
2. Click "Add Student"
3. Enter student email
4. Enter student name
5. Click "Add"

**Method 2: Bulk Upload**
1. Click "Bulk Upload"
2. Download CSV template
3. Fill in student details:
   ```
   name,email
   John Doe,john@example.com
   Jane Smith,jane@example.com
   ```
4. Upload filled CSV
5. Review and confirm

**Removing Students**:
1. Open batch details
2. Find student in list
3. Click "Remove" button
4. Confirm removal

**Note**: Removing from batch doesn't delete the student account.

### 4. Batch Settings

**Editing Batch Info**:
1. Open batch details
2. Click "Edit Batch"
3. Modify fields
4. Click "Save Changes"

**Archiving Batches**:
1. Open batch details
2. Click "Archive Batch"
3. Confirm archival
4. Archived batches remain viewable but inactive

---

## Student Management

### 1. Viewing All Students

**Student List**:
- Go to "Students" page
- See all students across batches
- View key information:
  - Name and email
  - Batch name
  - Progress percentage
  - Last active date

**Filters**:
- Filter by batch
- Filter by performance
- Search by name/email
- Sort by various fields

### 2. Individual Student View

Click on a student to see:

**Profile Information**:
- Full name and email
- Batch assignment
- Account creation date
- Last login and activity

**Performance Metrics**:
- Overall average score
- Assessments completed
- Completion rate
- Topic-wise performance

**Recent Activity**:
- Recent submissions
- Scores and timestamps
- Time taken per assessment

**Progress Charts**:
- Score trends over time
- Topic proficiency radar
- Activity heatmap

### 3. Student Analytics

**Performance Analysis**:
- Identify struggling students
- Recognize top performers
- Track improvement trends
- Analyze topic weaknesses

**At-Risk Identification**:
Students flagged if:
- Average score < 60%
- Completion rate < 50%
- No activity in 7 days
- Declining score trend

### 4. Student Communication

**Send Notifications**:
1. Select student(s)
2. Click "Send Notification"
3. Enter message title and text
4. Set priority level
5. Click "Send"

**Provide Feedback**:
- Add comments to submissions
- Provide personalized tips
- Encourage improvement

---

## Creating Assessments

### 1. Assessment Types

**AI-Generated Assessments**:
- Questions generated by Google Gemini AI
- Topic-based question generation
- Automatic difficulty balancing
- Instant question creation

**Manual Assessments**:
- Create questions manually
- Full control over content
- Import from question bank
- Reuse previous questions

**Coding Challenges**:
- Programming problems
- Test case-based evaluation
- Multi-language support

### 2. Creating AI-Generated Assessment

**Step 1: Basic Configuration**
1. Go to "Assessments" → "Create Assessment"
2. Select "AI-Generated"
3. Fill in details:
   - **Title**: Clear, descriptive title
   - **Topic**: Specific topic (e.g., "Python Functions")
   - **Difficulty**: Easy, Medium, or Hard
   - **Number of Questions**: 5-20 recommended
   - **Time Limit**: In minutes

**Step 2: Select Batches**
- Select one or more batches
- Preview total students affected
- Set different deadlines per batch (optional)

**Step 3: Generate Questions**
1. Click "Generate Questions with AI"
2. Wait for AI generation (10-30 seconds)
3. Questions appear for review

**Step 4: Review & Edit Questions**
- Review each question
- Check answer correctness
- Edit question text if needed
- Modify options
- Change correct answer
- Regenerate individual questions

**Step 5: Configure Settings**
- **Shuffle Questions**: Randomize order
- **Shuffle Options**: Randomize answer order
- **Show Results**: Immediate vs delayed
- **Allow Review**: Let students review answers
- **Max Attempts**: Number of retakes allowed
- **Passing Score**: Minimum score for pass

**Step 6: Publish**
1. Preview full assessment
2. Set publication date/time
3. Click "Publish Assessment"
4. Students receive notifications

### 3. Creating Manual Assessment

1. Go to "Assessments" → "Create Assessment"
2. Select "Manual"
3. Add questions one by one:
   - Enter question text
   - Add options (2-6 options)
   - Mark correct answer
   - Add explanation
   - Set points
4. Configure settings
5. Publish

### 4. Creating Coding Challenge

1. Go to "Coding" → "Create Problem"
2. Fill in problem details:
   - **Title**: Problem name
   - **Description**: Problem statement
   - **Input Format**: Input specifications
   - **Output Format**: Output specifications
   - **Constraints**: Time, memory limits
   - **Difficulty**: Easy, Medium, Hard
3. Add test cases:
   - Input
   - Expected output
   - Mark as sample or hidden
   - Assign points
4. Add starter code (optional)
5. Add solution and explanation
6. Publish problem

---

## AI Question Generation

### 1. How AI Generation Works

The platform uses **Google Gemini AI** to generate questions:

1. You provide topic and parameters
2. AI analyzes topic and difficulty
3. Generates relevant questions
4. Creates plausible distractors
5. Provides explanations
6. Returns for your review

### 2. Topic Specification

**Be Specific**:
- ❌ Bad: "Math"
- ✅ Good: "Quadratic Equations"
- ✅ Good: "Python List Comprehensions"
- ✅ Good: "World War 2 Causes"

**Use Keywords**:
- Include important concepts
- Mention specific subtopics
- Reference learning objectives

### 3. Difficulty Levels

**Easy**:
- Basic recall and understanding
- Simple concepts
- Straightforward questions
- Recommended for beginners

**Medium**:
- Application and analysis
- Moderate complexity
- Requires deeper understanding
- Recommended for intermediate

**Hard**:
- Synthesis and evaluation
- Complex scenarios
- Critical thinking required
- Recommended for advanced

### 4. Question Quality

**AI-generated questions are reviewed for**:
- Factual accuracy
- Clear wording
- Appropriate difficulty
- Plausible distractors
- Valid explanations

**Always Review**:
- AI can make mistakes
- Verify answer correctness
- Check for ambiguity
- Ensure appropriateness

### 5. Regenerating Questions

**Individual Regeneration**:
1. Click regenerate icon on question
2. AI generates new question
3. Review and accept or regenerate again

**Bulk Regeneration**:
1. Select multiple questions
2. Click "Regenerate Selected"
3. Review all new questions

### 6. Question Bank

All AI-generated questions are saved to question bank:
- Reuse in future assessments
- Build subject-wise repository
- Track question performance
- Refine over time

---

## Managing Assessments

### 1. Assessment List

View all assessments:
- **Active**: Published and ongoing
- **Drafts**: Not yet published
- **Scheduled**: Future publication
- **Completed**: Past deadline
- **Archived**: No longer active

### 2. Editing Assessments

**Before Publication**:
- Full editing capabilities
- Add/remove questions
- Change settings
- Modify batches

**After Publication**:
- Limited editing
- Can't change questions
- Can extend deadline
- Can add batches
- Can archive

### 3. Assessment Analytics

Click on assessment to view:
- **Submission Stats**: Total, pending, completed
- **Score Distribution**: Histogram
- **Average Score**: Overall average
- **Time Statistics**: Average time taken
- **Question Analysis**: Per-question statistics

### 4. Managing Submissions

**Pending Submissions**:
- See who hasn't submitted
- Send reminders
- Extend deadline if needed

**Completed Submissions**:
- View individual results
- Export all results
- Provide feedback
- Flag for review

### 5. Assessment Actions

**Extend Deadline**:
1. Open assessment
2. Click "Extend Deadline"
3. Set new deadline
4. Notify students

**Archive Assessment**:
1. Open assessment
2. Click "Archive"
3. Confirm archival
4. Results remain accessible

**Duplicate Assessment**:
1. Open assessment
2. Click "Duplicate"
3. Modify as needed
4. Publish to different batches

---

## Viewing Results

### 1. Individual Results

**Student Submission View**:
- Student name and details
- Overall score and percentage
- Time taken
- Submission timestamp
- Answer-by-answer breakdown

**Question Breakdown**:
- Question text
- Student answer
- Correct answer
- Whether correct
- Time spent on question

### 2. Batch Results

**Overview**:
- Average score
- Completion rate
- Score distribution
- Top performers
- Struggling students

**Comparison**:
- Compare batches
- Identify trends
- Benchmark performance

### 3. Assessment Results

**Question Performance**:
- Which questions were hardest
- Which questions were easiest
- Average time per question
- Most common wrong answers

**Insights**:
- Identify concept gaps
- Adjust future teaching
- Refine question difficulty

### 4. Exporting Results

**Export Formats**:
- CSV: Data analysis
- PDF: Print reports
- Excel: Advanced analysis

**Export Options**:
1. Select assessment or batch
2. Click "Export Results"
3. Choose format
4. Select data fields
5. Download file

---

## Analytics & Reports

### 1. Performance Analytics

**Class Performance**:
- Overall average score
- Score trends over time
- Completion rates
- Active participation

**Topic Analysis**:
- Performance by topic
- Identify weak areas
- Track improvement
- Plan interventions

**Student Comparison**:
- Rank students
- Identify patterns
- Group similar performers
- Personalize learning

### 2. Engagement Analytics

**Activity Metrics**:
- Login frequency
- Time spent on platform
- Assessment completion rate
- Active learning hours

**Engagement Indicators**:
- Daily active users
- Weekly active users
- Average session duration
- Return rate

### 3. Custom Reports

**Create Reports**:
1. Go to "Analytics" → "Reports"
2. Select report type
3. Configure parameters:
   - Date range
   - Batches
   - Students
   - Metrics
4. Generate report
5. Export or save

**Report Types**:
- Student progress reports
- Batch performance reports
- Topic proficiency reports
- Comparative analysis reports

### 4. Data Visualization

**Charts Available**:
- Line charts: Trends over time
- Bar charts: Comparisons
- Pie charts: Distributions
- Radar charts: Topic proficiency
- Heatmaps: Activity patterns

---

## Communication

### 1. Announcements

**Create Announcement**:
1. Go to batch or "Communication"
2. Click "New Announcement"
3. Enter title and message
4. Select recipients (batch/students)
5. Set priority
6. Click "Send"

**Announcement Types**:
- 📢 General announcements
- ⚠️ Important notices
- 📅 Schedule changes
- 🎉 Achievements

### 2. Individual Messaging

**Message Student**:
1. Go to student profile
2. Click "Send Message"
3. Type message
4. Click "Send"

**Message includes**:
- Automatic notification
- Email copy (optional)
- Message history

### 3. Automated Notifications

**System Sends Automatically**:
- New assessment assigned
- Deadline reminders (24h, 1h before)
- Assessment graded
- Feedback available

**You Can Trigger**:
- Deadline extensions
- Important announcements
- Personal encouragement

### 4. Feedback Provision

**On Submissions**:
1. View student submission
2. Click "Add Feedback"
3. Provide constructive feedback
4. Suggest improvements
5. Click "Save Feedback"

**Best Feedback Practices**:
- Be specific and actionable
- Highlight strengths
- Provide clear next steps
- Be encouraging
- Reference specific questions

---

## Best Practices

### 1. Assessment Creation

✅ **Do**:
- Use clear, unambiguous language
- Test questions yourself
- Provide adequate time limits
- Mix difficulty levels
- Include explanations
- Review AI-generated content

❌ **Don't**:
- Use overly complex language
- Create trick questions
- Set unrealistic time limits
- Make all questions too easy/hard
- Skip question review
- Blindly trust AI generation

### 2. Batch Management

✅ **Do**:
- Keep batches reasonably sized (20-40 students)
- Use clear naming conventions
- Regularly update batch information
- Monitor batch performance
- Balance workload across batches

❌ **Don't**:
- Create oversized batches (>50 students)
- Use ambiguous names
- Neglect inactive students
- Favor certain batches
- Overload students with assessments

### 3. Student Engagement

✅ **Do**:
- Provide timely feedback
- Recognize achievements
- Address struggles early
- Maintain regular communication
- Set clear expectations
- Encourage peer learning

❌ **Don't**:
- Delay feedback for weeks
- Ignore low performers
- Communicate inconsistently
- Set unrealistic expectations
- Create negative competition

### 4. Using AI Features

✅ **Do**:
- Be specific with topics
- Review all generated questions
- Edit when necessary
- Test question quality
- Build question bank
- Learn AI capabilities

❌ **Don't**:
- Use vague topics
- Skip review process
- Accept all questions blindly
- Ignore quality issues
- Waste generated questions
- Over-rely on AI

### 5. Data & Analytics

✅ **Do**:
- Review analytics regularly
- Identify trends early
- Use data to inform teaching
- Track individual progress
- Export data for records
- Share insights appropriately

❌ **Don't**:
- Ignore analytics
- Wait for crisis intervention
- Rely solely on averages
- Violate student privacy
- Lose historical data
- Misinterpret statistics

---

## Troubleshooting

### Common Issues

**AI Generation Fails**:
- Check API key configuration
- Verify topic specificity
- Reduce question count
- Try again later
- Contact admin

**Students Can't See Assessment**:
- Verify assessment is published
- Check batch assignment
- Verify student in batch
- Check publication date/time

**Results Not Appearing**:
- Confirm student submitted
- Check for technical errors
- Refresh the page
- Verify assessment ID

**Bulk Upload Fails**:
- Check CSV format
- Verify required fields
- Remove special characters
- Check email validity
- Review error messages

### Getting Help

**Support Resources**:
1. **Platform Help**: Click "?" icon
2. **Admin Support**: Contact your admin
3. **Technical Support**: support@modlrn.com
4. **Documentation**: Read this guide
5. **Training**: Request training session

---

## Tips for Success

1. **Start Small**: Begin with simple assessments, grow complexity
2. **Be Consistent**: Regular assessments > occasional big tests
3. **Engage Students**: Use gamification features
4. **Analyze Data**: Let analytics guide your teaching
5. **Communicate**: Keep students informed and motivated
6. **Adapt**: Adjust based on student performance
7. **Collaborate**: Share best practices with other teachers
8. **Stay Updated**: Learn new platform features
9. **Provide Feedback**: Help students improve
10. **Be Patient**: Both with technology and students

---

## Keyboard Shortcuts

- `Alt + D`: Dashboard
- `Alt + S`: Students page
- `Alt + B`: Batches page
- `Alt + A`: Assessments page
- `Alt + R`: Results page
- `Alt + N`: Create new assessment

---

For additional help or training, contact your administrator or technical support.

Happy Teaching! 📚


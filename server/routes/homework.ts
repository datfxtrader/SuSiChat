
import express from 'express';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Homework help endpoint
router.post('/help', isAuthenticated, async (req, res) => {
  try {
    const { question, subject, difficulty, userId } = req.body;

    if (!question || !subject || !difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, subject, and difficulty level'
      });
    }

    // Create a specialized prompt based on subject and difficulty
    const subjectContext = getSubjectContext(subject);
    const difficultyContext = getDifficultyContext(difficulty);
    
    const prompt = `You are a helpful homework tutor specializing in ${subjectContext}. 
You're helping a ${difficultyContext} student with their question.

Please provide a clear, educational response that:
1. Explains the concept step-by-step
2. Uses age-appropriate language for ${difficulty} level
3. Encourages learning rather than just giving answers
4. Includes examples when helpful
5. Suggests follow-up practice if relevant

Student's question: ${question}

Provide a helpful, educational response:`;

    // Use the existing LLM service
    const llmService = await import('../llm');
    const response = await llmService.generateResponse(prompt, userId);

    res.json({
      success: true,
      response: response,
      subject,
      difficulty
    });

  } catch (error) {
    console.error('Homework help error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process homework help request'
    });
  }
});

function getSubjectContext(subject: string): string {
  const contexts: Record<string, string> = {
    'math': 'mathematics and problem-solving',
    'science': 'scientific concepts and experiments',
    'english': 'reading, writing, and literature',
    'history': 'historical events and analysis',
    'art': 'creative arts and visual expression',
    'music': 'music theory and composition',
    'other': 'general academic subjects'
  };
  return contexts[subject] || 'general academic subjects';
}

function getDifficultyContext(difficulty: string): string {
  const contexts: Record<string, string> = {
    'elementary': 'elementary school (grades K-5)',
    'middle': 'middle school (grades 6-8)',
    'high': 'high school (grades 9-12)',
    'college': 'college/university level'
  };
  return contexts[difficulty] || 'student';
}

export default router;

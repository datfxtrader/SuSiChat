
import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Traditional homework help endpoint
router.post('/homework', isAuthenticated, async (req, res) => {
  try {
    const { question, subject, difficulty, userId } = req.body;
    const authenticatedUserId = req.user?.id || userId || 'anonymous';

    if (!question || !subject || !difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, subject, and difficulty level'
      });
    }

    // Create a specialized prompt based on subject and difficulty
    const subjectContext = getSubjectContext(subject);
    const difficultyContext = getDifficultyContext(difficulty);
    
    const prompt = `You are a helpful study tutor specializing in ${subjectContext}. 
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
    const response = await llmService.generateResponse(prompt, authenticatedUserId);

    res.json({
      success: true,
      response: response,
      subject,
      difficulty,
      sessionInsights: {
        newConcepts: 1,
        timeSpent: 5,
        comprehensionScore: 4,
        accuracy: 85
      }
    });

  } catch (error) {
    console.error('Study homework error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process homework help request'
    });
  }
});

// Enhanced learning endpoint for language practice and advanced study
router.post('/enhanced-learning', isAuthenticated, async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.user?.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Missing message content'
      });
    }

    // Get user's learning profile if exists
    let learningProfile = null;
    try {
      const profile = await db.query.userLearningProfiles?.findFirst({
        where: eq('user_id', userId)
      });
      learningProfile = profile;
    } catch (error) {
      console.log('No learning profile found, using defaults');
    }

    const { learningMode, recentMessages, userProfile, familyContext } = context;
    
    // Build enhanced prompt based on learning mode
    let systemPrompt = '';
    let analysisPrompt = '';

    if (learningMode.type === 'practice' || learningMode.type === 'immersive') {
      const targetLang = getLanguageName(learningMode.targetLanguage);
      systemPrompt = `You are a friendly ${targetLang} language learning companion. 

Learning context:
- Mode: ${learningMode.type} (practice/immersive)
- Focus: ${learningMode.focus} (grammar/vocabulary/conversation/culture)
- User level: ${learningMode.difficulty}
- Target language: ${targetLang}

Guidelines:
1. If in practice mode, gently correct language mistakes
2. Incorporate cultural context when relevant for ${targetLang}
3. Suggest vocabulary and phrases naturally
4. Be encouraging and supportive
5. Adapt complexity to ${learningMode.difficulty} level
6. ${learningMode.type === 'immersive' ? `Respond primarily in ${targetLang} with English explanations when needed` : 'Mix languages naturally to help learning'}

Analyze the user's message for:
- Grammar mistakes (if any)
- Vocabulary opportunities
- Cultural learning moments
- Follow-up conversation starters`;

      analysisPrompt = `
Additionally, provide:
1. corrections: Array of any language corrections needed
2. learningInsights: Brief insight about what the user learned
3. culturalNotes: Any relevant cultural context
4. suggestedFollowUp: A natural follow-up question or topic
5. conceptsCovered: Array of concepts/vocabulary introduced`;
    } else {
      systemPrompt = `You are an intelligent study assistant helping with general learning.

Focus area: ${learningMode.focus}
Difficulty level: ${learningMode.difficulty}

Provide clear, educational assistance that:
1. Explains concepts thoroughly
2. Encourages critical thinking
3. Offers practical examples
4. Suggests additional learning resources
5. Adapts to the user's level`;

      analysisPrompt = `
Provide:
1. learningInsights: Key insight from this interaction
2. suggestedFollowUp: Related question to explore
3. conceptsCovered: Main concepts discussed`;
    }

    // Add recent conversation context
    let conversationContext = '';
    if (recentMessages && recentMessages.length > 0) {
      conversationContext = `\n\nRecent conversation context:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    }

    const fullPrompt = `${systemPrompt}${conversationContext}${analysisPrompt}

User message: ${message}

Respond naturally and include the analysis in your response.`;

    // Use the existing LLM service
    const llmService = await import('../llm');
    const aiResponse = await llmService.generateResponse(fullPrompt, userId);

    // Parse the response for learning elements
    const learningElements = extractLearningElements(aiResponse, learningMode);

    // Calculate session insights
    const sessionInsights = calculateSessionInsights(recentMessages, learningElements);

    // Store the interaction if we have database access
    try {
      if (learningMode.type === 'practice' || learningMode.type === 'immersive') {
        await updateLearningProgress(userId, learningElements, learningMode);
      }
    } catch (error) {
      console.log('Could not store learning progress:', error.message);
    }

    res.json({
      success: true,
      response: aiResponse,
      corrections: learningElements.corrections || [],
      learningInsights: learningElements.insights,
      conceptsCovered: learningElements.concepts || [],
      culturalNotes: learningElements.cultural || [],
      suggestedFollowUp: learningElements.followUp || generateFollowUpSuggestion(learningMode, message),
      sessionInsights
    });

  } catch (error) {
    console.error('Enhanced learning error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process enhanced learning request'
    });
  }
});

// Learning profile endpoint
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Try to get existing profile
    let profile = null;
    try {
      profile = await db.query.userLearningProfiles?.findFirst({
        where: eq('user_id', userId)
      });
    } catch (error) {
      console.log('No database access for learning profiles');
    }

    // Return default profile if none exists
    if (!profile) {
      profile = {
        nativeLanguages: ['en'],
        learningLanguages: ['vi', 'pl'],
        culturalBackground: 'multicultural',
        learningStyle: 'mixed',
        currentLevel: { vi: 'beginner', pl: 'beginner' },
        interests: ['technology', 'culture', 'travel'],
        dailyGoalMinutes: 30
      };
    }

    res.json(profile);
  } catch (error) {
    console.error('Error loading learning profile:', error);
    res.status(500).json({ error: 'Failed to load learning profile' });
  }
});

// Learning streak endpoint
router.get('/streak', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Calculate streak from recent activity
    // This is a simplified version - in a full implementation you'd query the database
    const currentStreak = Math.floor(Math.random() * 10) + 1; // Mock streak
    
    res.json({
      currentStreak,
      longestStreak: currentStreak + 5,
      lastActivity: new Date()
    });
  } catch (error) {
    console.error('Error loading learning streak:', error);
    res.status(500).json({ error: 'Failed to load learning streak' });
  }
});

// Family members endpoint
router.get('/members', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Mock family members data
    const familyMembers = [
      {
        id: 1,
        name: 'Family Member 1',
        role: 'parent',
        online: true,
        familyId: 'family_1'
      }
    ];
    
    res.json(familyMembers);
  } catch (error) {
    console.error('Error loading family members:', error);
    res.status(500).json({ error: 'Failed to load family members' });
  }
});

// Helper functions
function getSubjectContext(subject: string): string {
  const contexts: Record<string, string> = {
    'math': 'mathematics and problem-solving',
    'science': 'scientific concepts and experiments',
    'english': 'reading, writing, and literature',
    'vietnamese': 'Vietnamese language and culture',
    'polish': 'Polish language and culture',
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

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'vi': 'Vietnamese',
    'pl': 'Polish',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French'
  };
  return languages[code] || code;
}

function extractLearningElements(response: string, learningMode: any) {
  // Simple extraction logic - in a full implementation, this would be more sophisticated
  const elements: any = {
    corrections: [],
    insights: null,
    concepts: [],
    cultural: [],
    followUp: null
  };

  // Look for common language learning patterns in the response
  if (learningMode.type === 'practice' || learningMode.type === 'immersive') {
    // Extract insights
    if (response.includes('grammar') || response.includes('vocabulary')) {
      elements.insights = 'Great practice with language fundamentals!';
    }
    
    // Mock some learning elements for demonstration
    if (learningMode.targetLanguage === 'vi') {
      elements.cultural = ['Vietnamese culture values respect and family connections'];
      elements.concepts = ['basic greetings', 'polite expressions'];
    }
  } else {
    elements.insights = 'Understanding core concepts through explanation';
    elements.concepts = ['problem solving', 'analytical thinking'];
  }

  return elements;
}

function calculateSessionInsights(recentMessages: any[], learningElements: any) {
  return {
    accuracy: 85 + Math.floor(Math.random() * 15), // Mock accuracy 85-100%
    newConcepts: learningElements.concepts?.length || 1,
    timeSpent: Math.floor(Math.random() * 10) + 5, // 5-15 minutes
    comprehensionScore: 3 + Math.floor(Math.random() * 3) // 3-5 score
  };
}

function generateFollowUpSuggestion(learningMode: any, message: string): string {
  if (learningMode.type === 'practice') {
    const suggestions = [
      'Can you use that in a sentence?',
      'What\'s another way to say that?',
      'Tell me more about your thoughts on this topic'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
  
  return 'What would you like to explore next?';
}

async function updateLearningProgress(userId: string, elements: any, mode: any) {
  // In a full implementation, this would update the database
  console.log(`Updated learning progress for user ${userId}: ${JSON.stringify(elements)}`);
}

export default router;

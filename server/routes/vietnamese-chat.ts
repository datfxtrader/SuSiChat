
import { Router } from 'express';
import { VietnamesePersonalityService } from '../services/personality/VietnamesePersonalityService';
import { VietnameseLanguageService } from '../services/language/VietnameseLanguageService';
import { GoogleAuthService } from '../auth/GoogleAuthService';

const router = Router();
const personalityService = new VietnamesePersonalityService();
const languageService = new VietnameseLanguageService();
const authService = new GoogleAuthService();

// Middleware to verify authentication
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // Verify session token
    const result = await req.db.query(
      'SELECT u.* FROM users u JOIN user_sessions s ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Chat endpoint
router.post('/chat/vietnamese', requireAuth, async (req: any, res: any) => {
  try {
    const { message, mood, context } = req.body;
    const userId = req.user.id;

    // Get user profile
    const userProfile = await getUserProfile(req.db, userId);
    
    // Detect language and code-switching
    const languageAnalysis = await languageService.detectCodeSwitching(message);
    
    // Build conversation context
    const recentConversations = await getRecentConversations(req.db, userId, userProfile.memoryDuration);
    
    // Build personalized prompt
    const prompt = await personalityService.buildPersonalizedPrompt({
      message,
      userProfile,
      recentConversations,
      language: languageAnalysis.primaryLanguage
    });

    // Generate response using AI (you would integrate with your AI service here)
    const response = await generateAIResponse(prompt, mood);
    
    // Store conversation
    await storeConversation(req.db, userId, message, response, languageAnalysis);

    res.json({
      success: true,
      response,
      detectedLanguages: languageAnalysis.segments.map(s => s.language),
      hasCodeSwitching: languageAnalysis.hasCodeSwitching,
      slangTerms: languageAnalysis.slangTerms
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// User profile endpoint
router.get('/user/profile', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const profile = await getUserProfile(req.db, userId);
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// Admin routes
router.get('/admin/whitelist', requireAuth, async (req: any, res: any) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const whitelist = await authService.getWhitelist();
    res.json({ success: true, whitelist });
  } catch (error) {
    console.error('Whitelist get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get whitelist' });
  }
});

router.post('/admin/whitelist', requireAuth, async (req: any, res: any) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { email } = req.body;
    await authService.addToWhitelist(email, req.user.email);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Whitelist add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add to whitelist' });
  }
});

router.delete('/admin/whitelist', requireAuth, async (req: any, res: any) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { email } = req.body;
    await authService.removeFromWhitelist(email);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Whitelist remove error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from whitelist' });
  }
});

// Helper functions
async function getUserProfile(db: any, userId: string): Promise<any> {
  const result = await db.query(`
    SELECT 
      u.*,
      us.memory_retention_days,
      us.memory_categories,
      us.cultural_background,
      COALESCE(us.languages, ARRAY['en']) as languages,
      COALESCE(us.interests, ARRAY[]::text[]) as interests
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
    WHERE u.id = $1
  `, [userId]);
  
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  
  return {
    ...result.rows[0],
    memoryDuration: result.rows[0].memory_retention_days || 30,
    preferredStyle: 'friendly'
  };
}

async function getRecentConversations(db: any, userId: string, days: number): Promise<any[]> {
  const result = await db.query(`
    SELECT 
      conversation_id,
      messages,
      created_at as timestamp
    FROM conversations 
    WHERE user_id = $1 
    AND created_at > NOW() - INTERVAL '${days} days'
    ORDER BY created_at DESC
    LIMIT 10
  `, [userId]);
  
  return result.rows;
}

async function storeConversation(db: any, userId: string, userMessage: string, aiResponse: string, languageAnalysis: any): Promise<void> {
  await db.query(`
    INSERT INTO conversations (user_id, messages, language_analysis, created_at)
    VALUES ($1, $2, $3, NOW())
  `, [
    userId,
    JSON.stringify([
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
    ]),
    JSON.stringify(languageAnalysis)
  ]);
}

async function generateAIResponse(prompt: string, mood: string): Promise<string> {
  // This would integrate with your AI service (DeepSeek, OpenAI, etc.)
  // For now, return a placeholder response
  
  const responses = {
    happy: "That's wonderful! I'm so happy to hear that! 😊",
    excited: "Wow, that sounds amazing! I'm excited for you! 🎉",
    thoughtful: "That's really interesting to think about... 🤔",
    tired: "I understand, sometimes we all need rest. Take care of yourself 😴",
    stressed: "I'm here for you. Take a deep breath, we'll get through this together 😰",
    neutral: "I hear you. Tell me more about what's on your mind 😌"
  };
  
  return responses[mood] || responses.neutral;
}

export default router;

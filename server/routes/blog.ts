
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { and, eq, gte, or, sql, lt, desc } from 'drizzle-orm';
import { blogPosts, userInterests, userLanguages, userBlogInteractions, vocabularyProgress } from '../db/schema/blog';

const router = Router();

// Validation schemas
const interactionSchema = z.object({
  interactionType: z.enum(['view', 'click', 'share', 'fact_check', 'dislike']),
  timeSpent: z.number().optional(),
  vocabularyLearned: z.array(z.string()).optional()
});

const interestsSchema = z.object({
  interests: z.array(z.object({
    categoryId: z.string(),
    subcategories: z.array(z.string()),
    weight: z.number().min(1).max(10)
  }))
});

// Get personalized blog feed
router.get('/api/blog/personalized', async (req, res) => {
  try {
    const { language = 'en', category = 'all', personalizedOnly = false } = req.query;
    const userId = req.headers['user-id'] as string; // Get from auth middleware

    // Get user preferences
    const userPrefs = await db.select().from(userInterests).where(eq(userInterests.userId, userId));
    const userLangs = await db.select().from(userLanguages).where(eq(userLanguages.userId, userId));

    // Build query conditions
    const conditions = [
      gte(blogPosts.expiresAt, new Date()),
      eq(blogPosts.language, language as string)
    ];

    if (category !== 'all') {
      conditions.push(eq(blogPosts.category, category as string));
    }

    if (personalizedOnly === 'true') {
      conditions.push(eq(blogPosts.isPersonalized, true));
    }

    // Get posts with intelligent ordering
    const posts = await db.select().from(blogPosts)
      .where(and(...conditions))
      .orderBy(
        sql`
          CASE 
            WHEN is_personalized = true THEN 1
            WHEN is_trending = true THEN 2
            ELSE 3
          END,
          published_at DESC
        `
      )
      .limit(20);

    res.json({ posts, userPreferences: { interests: userPrefs, languages: userLangs } });
  } catch (error) {
    console.error('Error fetching personalized blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post with interaction tracking
router.get('/api/blog/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.headers['user-id'] as string;

    const post = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
    
    if (!post.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Track view interaction
    if (userId) {
      await db.insert(userBlogInteractions).values({
        userId,
        postId,
        interactionType: 'view',
        timeSpent: 0
      });
    }

    res.json({ post: post[0] });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Track blog interaction
router.post('/api/blog/:postId/interact', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.headers['user-id'] as string;
    
    const validation = interactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid interaction data' });
    }

    const { interactionType, timeSpent, vocabularyLearned } = validation.data;

    await db.insert(userBlogInteractions).values({
      userId,
      postId,
      interactionType,
      timeSpent,
      vocabularyLearned
    });

    // Update vocabulary progress if words were learned
    if (vocabularyLearned && vocabularyLearned.length > 0) {
      for (const word of vocabularyLearned) {
        await db.insert(vocabularyProgress).values({
          userId,
          word,
          language: 'en', // Could be dynamic
          timesEncountered: 1
        }).onConflictDoUpdate({
          target: [vocabularyProgress.userId, vocabularyProgress.word],
          set: {
            timesEncountered: sql`${vocabularyProgress.timesEncountered} + 1`,
            lastSeen: new Date()
          }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// Fact check article
router.post('/api/blog/:postId/validate', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Get the post content
    const post = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
    if (!post.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Call DeerFlow validation service
    const validationResponse = await fetch('http://0.0.0.0:9000/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId,
        content: post[0].content,
        title: post[0].title,
        sources: post[0].sourceUrls
      })
    });

    if (!validationResponse.ok) {
      throw new Error('Validation service unavailable');
    }

    const result = await validationResponse.json();
    
    // Update fact check score
    await db.update(blogPosts)
      .set({ 
        factChecked: true,
        factCheckScore: result.score,
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, postId));

    res.json(result);
  } catch (error) {
    console.error('Error validating post:', error);
    res.status(500).json({ error: 'Failed to validate post' });
  }
});

// Update user interests
router.put('/api/user/interests', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    
    const validation = interestsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid interests data' });
    }

    const { interests } = validation.data;

    // Delete existing interests
    await db.delete(userInterests).where(eq(userInterests.userId, userId));

    // Insert new interests
    if (interests.length > 0) {
      await db.insert(userInterests).values(
        interests.map((interest) => ({
          userId,
          categoryId: interest.categoryId,
          subcategories: interest.subcategories,
          weight: interest.weight
        }))
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating interests:', error);
    res.status(500).json({ error: 'Failed to update interests' });
  }
});

// Get trending topics
router.get('/api/blog/trending', async (req, res) => {
  try {
    const { language = 'en', limit = 10 } = req.query;

    const trendingPosts = await db.select().from(blogPosts)
      .where(and(
        eq(blogPosts.isTrending, true),
        eq(blogPosts.language, language as string),
        gte(blogPosts.expiresAt, new Date())
      ))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(Number(limit));

    res.json({ posts: trendingPosts });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});

// Get user's vocabulary progress
router.get('/api/user/vocabulary-progress', async (req, res) => {
  try {
    const userId = req.headers['user-id'] as string;
    const { language = 'en' } = req.query;

    const progress = await db.select().from(vocabularyProgress)
      .where(and(
        eq(vocabularyProgress.userId, userId),
        eq(vocabularyProgress.language, language as string)
      ))
      .orderBy(desc(vocabularyProgress.lastSeen));

    res.json({ progress });
  } catch (error) {
    console.error('Error fetching vocabulary progress:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary progress' });
  }
});

export default router;

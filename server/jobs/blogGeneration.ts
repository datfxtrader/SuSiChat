
import cron from 'node-cron';
import { BlogGenerationService } from '../services/blogGeneration';
import { db } from '../db';
import { userInterests, blogPosts } from '../db/schema/blog';
import { lt, count } from 'drizzle-orm';

let blogService: BlogGenerationService | null = null;

export function initializeBlogGenerationJob() {
  try {
    blogService = new BlogGenerationService();
    
    // Generate personalized content every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Starting personalized blog content generation...');
      
      try {
        // Get all users with interests
        const usersWithInterests = await db.selectDistinct({
          userId: userInterests.userId
        }).from(userInterests);
        
        console.log(`Generating content for ${usersWithInterests.length} users`);
        
        // Generate content for each user (batch of 10)
        for (let i = 0; i < usersWithInterests.length; i += 10) {
          const batch = usersWithInterests.slice(i, i + 10);
          
          await Promise.allSettled(
            batch.map(user => 
              blogService!.generatePersonalizedContent(user.userId)
            )
          );
          
          // Wait 30 seconds between batches to avoid rate limiting
          if (i + 10 < usersWithInterests.length) {
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
        }
        
        console.log('Personalized blog content generation completed');
      } catch (error) {
        console.error('Personalized blog generation job failed:', error);
      }
    });
    
    // Generate trending content every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      console.log('Starting trending blog content generation...');
      
      try {
        await blogService!.generateTrendingContent();
        console.log('Trending blog content generation completed');
      } catch (error) {
        console.error('Trending blog generation job failed:', error);
      }
    });
    
    // Clean up expired posts daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting blog cleanup...');
      
      try {
        const result = await db.delete(blogPosts).where(
          lt(blogPosts.expiresAt, new Date())
        );
        
        console.log(`Cleaned up expired blog posts`);
        
        // Also clean up old interactions (older than 30 days)
        // This would be implemented based on your data retention policy
        
      } catch (error) {
        console.error('Blog cleanup job failed:', error);
      }
    });
    
    // Health check - log stats every hour
    cron.schedule('0 * * * *', async () => {
      try {
        const totalPosts = await db.select({ count: count() }).from(blogPosts);
        const personalizedPosts = await db.select({ count: count() })
          .from(blogPosts)
          .where(eq(blogPosts.isPersonalized, true));
        
        console.log(`Blog stats - Total: ${totalPosts[0].count}, Personalized: ${personalizedPosts[0].count}`);
      } catch (error) {
        console.error('Blog stats check failed:', error);
      }
    });
    
    console.log('Blog generation jobs initialized successfully');
  } catch (error) {
    console.error('Failed to initialize blog generation jobs:', error);
  }
}

// Manual trigger for testing
export async function triggerBlogGeneration(userId?: string) {
  if (!blogService) {
    blogService = new BlogGenerationService();
  }
  
  if (userId) {
    await blogService.generatePersonalizedContent(userId);
  } else {
    await blogService.generateTrendingContent();
  }
}

// Function to cleanup and restart jobs
export function restartBlogJobs() {
  // Stop all cron jobs
  cron.getTasks().forEach(task => task.destroy());
  
  // Reinitialize
  initializeBlogGenerationJob();
}

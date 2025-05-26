
import cron from 'node-cron';
import { db } from '../db';

interface LearningProfile {
  userId: number;
  nativeLanguages: string[];
  learningLanguages: string[];
  culturalBackground: string;
  interests: string[];
  currentLevel: Record<string, string>;
  learningStyle: string;
  dailyGoalMinutes: number;
}

interface PreparedContent {
  lessons: any[];
  vocabulary: any[];
  exercises: any[];
  culturalNotes: any[];
  conversationStarters: string[];
  metadata: {
    generatedAt: Date;
    validUntil: Date;
    sourceTopics: string[];
  };
}

export class ContentPreparationService {
  private isRunning = false;

  constructor() {
    this.initializeCronJobs();
    console.log('Content Preparation Service initialized');
  }

  initializeCronJobs() {
    // Run every day at 2 AM to prepare next day's content
    cron.schedule('0 2 * * *', async () => {
      if (this.isRunning) return;
      
      console.log('Starting daily content preparation...');
      await this.prepareContentForAllUsers();
    });

    // Run every 6 hours to prepare trending content
    cron.schedule('0 */6 * * *', async () => {
      if (this.isRunning) return;
      
      console.log('Preparing trending educational content...');
      await this.prepareTrendingContent();
    });

    // Run every hour to process news for learning
    cron.schedule('0 * * * *', async () => {
      if (this.isRunning) return;
      
      console.log('Processing current events for educational content...');
      await this.processCurrentEventsForLearning();
    });
  }

  async prepareContentForAllUsers() {
    this.isRunning = true;
    
    try {
      // Get active users with learning interests
      const users = await this.getActiveUsers();
      
      for (const user of users) {
        try {
          const profile = await this.getLearningProfile(user.id);
          if (!profile) continue;

          // Generate personalized content for next day
          const content = await this.generatePersonalizedContent(profile);

          // Store in preparation queue
          await this.storeContentInQueue(user.id, content);

          console.log(`Prepared content for user ${user.id}`);
        } catch (error) {
          console.error(`Error preparing content for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in prepareContentForAllUsers:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async getActiveUsers(): Promise<Array<{ id: number; email: string }>> {
    // Mock active users - in real implementation, query from database
    return [
      { id: 1, email: 'user1@example.com' },
      { id: 2, email: 'user2@example.com' }
    ];
  }

  async getLearningProfile(userId: number): Promise<LearningProfile | null> {
    // Mock learning profile - in real implementation, query from database
    return {
      userId,
      nativeLanguages: ['en'],
      learningLanguages: ['vi', 'pl'],
      culturalBackground: 'multicultural',
      interests: ['technology', 'culture', 'travel'],
      currentLevel: { vi: 'beginner', pl: 'intermediate' },
      learningStyle: 'visual',
      dailyGoalMinutes: 30
    };
  }

  async generatePersonalizedContent(profile: LearningProfile): Promise<PreparedContent> {
    const content: PreparedContent = {
      lessons: [],
      vocabulary: [],
      exercises: [],
      culturalNotes: [],
      conversationStarters: [],
      metadata: {
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        sourceTopics: []
      }
    };

    // Generate content for each learning language
    for (const language of profile.learningLanguages) {
      const languageContent = await this.generateLanguageSpecificContent(
        language,
        profile.interests,
        profile.currentLevel[language] || 'beginner'
      );

      content.lessons.push(...languageContent.lessons);
      content.vocabulary.push(...languageContent.vocabulary);
      content.exercises.push(...languageContent.exercises);
      content.culturalNotes.push(...languageContent.culturalNotes);
      content.conversationStarters.push(...languageContent.conversationStarters);
    }

    // Add current events content
    const newsContent = await this.generateNewsBasedContent(profile);
    content.lessons.push(...newsContent.lessons);
    content.metadata.sourceTopics.push(...newsContent.sourceTopics);

    return content;
  }

  async generateLanguageSpecificContent(language: string, interests: string[], level: string) {
    const languageNames: Record<string, string> = {
      'vi': 'Vietnamese',
      'pl': 'Polish',
      'zh': 'Chinese',
      'es': 'Spanish',
      'fr': 'French'
    };

    const languageName = languageNames[language] || language;

    // Generate vocabulary based on interests
    const vocabulary = this.generateVocabularyForInterests(language, interests, level);

    // Generate cultural notes
    const culturalNotes = this.generateCulturalNotes(language);

    // Generate conversation starters
    const conversationStarters = this.generateConversationStarters(language, interests);

    // Generate exercises
    const exercises = this.generateExercises(language, level, vocabulary);

    // Generate lesson content
    const lessons = [{
      id: `lesson_${language}_${Date.now()}`,
      title: `Daily ${languageName} Practice`,
      language,
      level,
      estimatedMinutes: 15,
      content: {
        introduction: `Today we'll practice ${languageName} with topics you're interested in: ${interests.join(', ')}`,
        mainContent: `Let's explore vocabulary and conversation patterns in ${languageName}`,
        conclusion: `Great job practicing ${languageName} today!`
      },
      objectives: [
        `Practice ${languageName} vocabulary`,
        'Improve conversational skills',
        'Learn cultural context'
      ]
    }];

    return {
      lessons,
      vocabulary,
      exercises,
      culturalNotes,
      conversationStarters
    };
  }

  generateVocabularyForInterests(language: string, interests: string[], level: string) {
    const vocabularySets: Record<string, Record<string, any[]>> = {
      'technology': {
        'vi': [
          { word: 'máy tính', translation: 'computer', level: 'beginner', usage: 'Tôi dùng máy tính mỗi ngày' },
          { word: 'điện thoại', translation: 'phone', level: 'beginner', usage: 'Điện thoại của tôi mới' },
          { word: 'internet', translation: 'internet', level: 'beginner', usage: 'Internet rất hữu ích' }
        ],
        'pl': [
          { word: 'komputer', translation: 'computer', level: 'beginner', usage: 'Używam komputera codziennie' },
          { word: 'telefon', translation: 'phone', level: 'beginner', usage: 'Mój telefon jest nowy' },
          { word: 'internet', translation: 'internet', level: 'beginner', usage: 'Internet jest bardzo przydatny' }
        ]
      },
      'travel': {
        'vi': [
          { word: 'du lịch', translation: 'travel', level: 'beginner', usage: 'Tôi thích du lịch' },
          { word: 'khách sạn', translation: 'hotel', level: 'beginner', usage: 'Khách sạn này đẹp' },
          { word: 'máy bay', translation: 'airplane', level: 'intermediate', usage: 'Máy bay cất cánh lúc 8 giờ' }
        ],
        'pl': [
          { word: 'podróż', translation: 'travel', level: 'beginner', usage: 'Lubię podróżować' },
          { word: 'hotel', translation: 'hotel', level: 'beginner', usage: 'Ten hotel jest ładny' },
          { word: 'samolot', translation: 'airplane', level: 'intermediate', usage: 'Samolot startuje o ósmej' }
        ]
      },
      'culture': {
        'vi': [
          { word: 'văn hóa', translation: 'culture', level: 'intermediate', usage: 'Văn hóa Việt Nam phong phú' },
          { word: 'truyền thống', translation: 'tradition', level: 'intermediate', usage: 'Đây là truyền thống cổ' },
          { word: 'lễ hội', translation: 'festival', level: 'beginner', usage: 'Lễ hội rất vui' }
        ],
        'pl': [
          { word: 'kultura', translation: 'culture', level: 'intermediate', usage: 'Kultura polska jest bogata' },
          { word: 'tradycja', translation: 'tradition', level: 'intermediate', usage: 'To stara tradycja' },
          { word: 'festiwal', translation: 'festival', level: 'beginner', usage: 'Festiwal jest bardzo wesoły' }
        ]
      }
    };

    const vocabulary = [];
    for (const interest of interests) {
      const interestVocab = vocabularySets[interest]?.[language] || [];
      vocabulary.push(...interestVocab.filter(v => v.level === level || level === 'advanced'));
    }

    return vocabulary.slice(0, 10); // Limit to 10 words
  }

  generateCulturalNotes(language: string) {
    const culturalNotes: Record<string, any[]> = {
      'vi': [
        {
          title: 'Vietnamese Greetings',
          content: 'Vietnamese greetings often include age-appropriate terms of address',
          context: 'social_interaction'
        },
        {
          title: 'Family Values',
          content: 'Family is central to Vietnamese culture, with respect for elders being paramount',
          context: 'family_relationships'
        }
      ],
      'pl': [
        {
          title: 'Polish Politeness',
          content: 'Polish culture emphasizes formal politeness, especially with strangers and elders',
          context: 'social_interaction'
        },
        {
          title: 'Historical Awareness',
          content: 'Understanding Polish history helps in cultural conversations',
          context: 'cultural_knowledge'
        }
      ]
    };

    return culturalNotes[language] || [];
  }

  generateConversationStarters(language: string, interests: string[]) {
    const starters: Record<string, string[]> = {
      'vi': [
        'Hôm nay bạn thế nào?',
        'Bạn thích làm gì vào cuối tuần?',
        'Bạn có sở thích gì không?',
        'Bạn làm nghề gì?'
      ],
      'pl': [
        'Jak się dzisiaj czujesz?',
        'Co lubisz robić w weekendy?',
        'Jakie masz hobby?',
        'Jaką masz pracę?'
      ]
    };

    return starters[language] || ['How are you today?'];
  }

  generateExercises(language: string, level: string, vocabulary: any[]) {
    return [
      {
        type: 'vocabulary_matching',
        title: 'Match the Words',
        instructions: 'Match the words with their translations',
        items: vocabulary.slice(0, 5).map(v => ({
          word: v.word,
          translation: v.translation
        }))
      },
      {
        type: 'fill_in_blanks',
        title: 'Complete the Sentences',
        instructions: 'Fill in the blanks with the correct words',
        items: vocabulary.slice(0, 3).map(v => ({
          sentence: v.usage.replace(v.word, '______'),
          answer: v.word
        }))
      },
      {
        type: 'conversation_practice',
        title: 'Practice Conversation',
        instructions: 'Use these phrases in a conversation',
        items: vocabulary.slice(0, 3).map(v => v.usage)
      }
    ];
  }

  async generateNewsBasedContent(profile: LearningProfile) {
    // Mock news-based content generation
    const trendingTopics = await this.getTrendingTopics();
    
    const lessons = trendingTopics.map(topic => ({
      id: `news_lesson_${Date.now()}_${topic.id}`,
      title: `Learn from Current Events: ${topic.title}`,
      type: 'news_based',
      content: {
        summary: topic.summary,
        vocabulary: this.extractVocabularyFromNews(topic.content, profile.learningLanguages),
        discussionPoints: this.generateDiscussionPoints(topic.content),
        culturalConnections: this.findCulturalConnections(topic.content, profile.culturalBackground)
      }
    }));

    return {
      lessons,
      sourceTopics: trendingTopics.map(t => t.title)
    };
  }

  async getTrendingTopics() {
    // Mock trending topics - in real implementation, this would fetch from news APIs
    return [
      {
        id: 1,
        title: 'Technology Advances in Education',
        summary: 'New educational technologies are changing how we learn',
        content: 'Educational technology is revolutionizing classrooms worldwide...'
      },
      {
        id: 2,
        title: 'Cultural Exchange Programs',
        summary: 'International cultural exchange programs promote understanding',
        content: 'Cultural exchange programs help students learn about different cultures...'
      }
    ];
  }

  extractVocabularyFromNews(content: string, languages: string[]) {
    // Simple keyword extraction - in real implementation, this would be more sophisticated
    const keywords = ['technology', 'education', 'culture', 'international', 'learning'];
    const vocabulary = [];

    for (const language of languages) {
      for (const keyword of keywords) {
        const translation = this.getTranslation(keyword, language);
        if (translation) {
          vocabulary.push({
            english: keyword,
            translation,
            language,
            context: `Used in current events about ${keyword}`
          });
        }
      }
    }

    return vocabulary;
  }

  getTranslation(word: string, language: string): string | null {
    const translations: Record<string, Record<string, string>> = {
      'vi': {
        'technology': 'công nghệ',
        'education': 'giáo dục',
        'culture': 'văn hóa',
        'international': 'quốc tế',
        'learning': 'học tập'
      },
      'pl': {
        'technology': 'technologia',
        'education': 'edukacja',
        'culture': 'kultura',
        'international': 'międzynarodowy',
        'learning': 'uczenie się'
      }
    };

    return translations[language]?.[word] || null;
  }

  generateDiscussionPoints(content: string) {
    return [
      'What do you think about this topic?',
      'How does this relate to your experience?',
      'What questions would you ask about this?',
      'How might this affect the future?'
    ];
  }

  findCulturalConnections(content: string, culturalBackground: string) {
    return [
      `This topic relates to ${culturalBackground} culture in several ways`,
      'Consider how different cultures might view this topic',
      'What cultural perspectives might be important here?'
    ];
  }

  async storeContentInQueue(userId: number, content: PreparedContent) {
    // Mock storage - in real implementation, this would store in database
    console.log(`Storing content for user ${userId}:`, {
      lessons: content.lessons.length,
      vocabulary: content.vocabulary.length,
      exercises: content.exercises.length
    });

    // In a real implementation:
    // await db.insert(contentPreparationQueue).values({
    //   userId,
    //   contentType: 'daily_lesson',
    //   targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    //   generatedContent: content,
    //   status: 'ready'
    // });
  }

  async prepareTrendingContent() {
    console.log('Preparing trending educational content...');
    
    // Get trending topics
    const topics = await this.getTrendingTopics();
    
    for (const topic of topics) {
      // Create educational content from trending topics
      const educationalContent = await this.createEducationalContentFromTopic(topic);
      
      // Store as learning module
      await this.storeLearningModule(educationalContent);
    }
  }

  async createEducationalContentFromTopic(topic: any) {
    return {
      title: {
        en: `Learn from Today's News: ${topic.title}`,
        vi: `Học từ tin tức hôm nay: ${topic.title}`,
        pl: `Ucz się z dzisiejszych wiadomości: ${topic.title}`
      },
      description: topic.summary,
      category: 'current_events',
      content: {
        vocabulary: this.extractVocabularyFromNews(topic.content, ['vi', 'pl']),
        comprehensionQuestions: this.generateComprehensionQuestions(topic.content),
        discussionPrompts: this.generateDiscussionPoints(topic.content)
      },
      estimatedMinutes: 15,
      createdAt: new Date()
    };
  }

  generateComprehensionQuestions(content: string) {
    return [
      'What is the main topic of this article?',
      'Who are the key people or organizations mentioned?',
      'What are the potential impacts discussed?',
      'What questions do you still have about this topic?'
    ];
  }

  async storeLearningModule(content: any) {
    console.log('Storing learning module:', content.title.en);
    
    // In a real implementation:
    // await db.insert(learningModules).values(content);
  }

  async processCurrentEventsForLearning() {
    console.log('Processing current events for educational opportunities...');
    
    // Get recent reading activity
    const recentActivity = await this.getRecentUserActivity();
    
    for (const activity of recentActivity) {
      // Extract learning opportunities
      const opportunities = await this.extractLearningFromActivity(activity);
      
      // Create follow-up content
      await this.createFollowUpContent(activity.userId, opportunities);
    }
  }

  async getRecentUserActivity() {
    // Mock recent activity - in real implementation, query from database
    return [
      {
        userId: 1,
        type: 'news_reading',
        content: 'User read articles about technology and education',
        timestamp: new Date()
      }
    ];
  }

  async extractLearningFromActivity(activity: any) {
    return {
      vocabularyOpportunities: ['technology', 'education', 'innovation'],
      culturalConnections: ['educational systems', 'technology adoption'],
      conversationStarters: [
        'What do you think about educational technology?',
        'How has technology changed learning?'
      ]
    };
  }

  async createFollowUpContent(userId: number, opportunities: any) {
    console.log(`Creating follow-up content for user ${userId}:`, opportunities);
    
    // Create personalized reminders and content based on opportunities
    // In a real implementation, this would create database entries for personalized content
  }

  // Method to get prepared content for a user
  async getPreparedContentForUser(userId: number): Promise<PreparedContent | null> {
    // Mock retrieval - in real implementation, query from database
    const profile = await this.getLearningProfile(userId);
    if (!profile) return null;

    return await this.generatePersonalizedContent(profile);
  }

  // Method to check if content preparation is running
  isContentPreparationRunning(): boolean {
    return this.isRunning;
  }
}

// Global instance
export const contentPreparationService = new ContentPreparationService();


import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, BookOpen, Calculator, Microscope, Globe, Palette, Music, Users, 
  Lightbulb, MessageCircle, Star, Clock, HelpCircle, Trophy, Languages,
  CheckCircle, AlertCircle, Brain, Heart, Zap, Target
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

interface StudyMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  subject?: string;
  difficulty?: string;
  learningMode?: LearningMode;
  corrections?: Array<{
    original: string;
    corrected: string;
    explanation: string;
    type: 'grammar' | 'vocabulary' | 'pronunciation';
  }>;
  learningInsights?: string;
  suggestedFollowUp?: string;
  culturalNotes?: string[];
}

interface LearningMode {
  type: 'study' | 'practice' | 'immersive' | 'family';
  targetLanguage: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus: 'grammar' | 'vocabulary' | 'conversation' | 'culture' | 'homework';
}

interface LearningProfile {
  nativeLanguages: string[];
  learningLanguages: string[];
  culturalBackground: string;
  learningStyle: string;
  currentLevel: Record<string, string>;
  interests: string[];
  dailyGoalMinutes: number;
}

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: Calculator, color: 'bg-blue-500' },
  { id: 'science', name: 'Science', icon: Microscope, color: 'bg-green-500' },
  { id: 'english', name: 'English', icon: BookOpen, color: 'bg-purple-500' },
  { id: 'history', name: 'History', icon: Globe, color: 'bg-orange-500' },
  { id: 'vietnamese', name: 'Vietnamese', icon: Languages, color: 'bg-red-500' },
  { id: 'polish', name: 'Polish', icon: Languages, color: 'bg-pink-500' },
  { id: 'art', name: 'Art', icon: Palette, color: 'bg-yellow-500' },
  { id: 'music', name: 'Music', icon: Music, color: 'bg-indigo-500' },
  { id: 'other', name: 'Other', icon: Users, color: 'bg-gray-500' }
];

const DIFFICULTY_LEVELS = [
  { id: 'elementary', name: 'Elementary (K-5)', color: 'bg-green-100 text-green-800' },
  { id: 'middle', name: 'Middle School (6-8)', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'high', name: 'High School (9-12)', color: 'bg-orange-100 text-orange-800' },
  { id: 'college', name: 'College/University', color: 'bg-red-100 text-red-800' }
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' }
];

const Study: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('study');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Learning state
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [learningMode, setLearningMode] = useState<LearningMode>({
    type: 'study',
    targetLanguage: 'en',
    difficulty: 'beginner',
    focus: 'homework'
  });
  const [corrections, setCorrections] = useState<Array<{
    original: string;
    corrected: string;
    explanation: string;
    type: 'grammar' | 'vocabulary' | 'pronunciation';
  }>>([]);
  const [learningStreak, setLearningStreak] = useState(0);
  const [sessionInsights, setSessionInsights] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadLearningProfile();
    loadFamilyMembers();
    loadLearningStreak();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadLearningProfile = async () => {
    try {
      const response = await fetch('/api/learning/profile');
      if (response.ok) {
        const profile = await response.json();
        setLearningProfile(profile);
        if (profile.learningLanguages?.length > 0) {
          setLearningMode(prev => ({ 
            ...prev, 
            targetLanguage: profile.learningLanguages[0] 
          }));
        }
      }
    } catch (error) {
      console.error('Error loading learning profile:', error);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const response = await fetch('/api/family/members');
      if (response.ok) {
        const members = await response.json();
        setFamilyMembers(members);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const loadLearningStreak = async () => {
    try {
      const response = await fetch('/api/learning/streak');
      if (response.ok) {
        const data = await response.json();
        setLearningStreak(data.currentStreak || 0);
      }
    } catch (error) {
      console.error('Error loading learning streak:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your question or study topic.",
        variant: "destructive"
      });
      return;
    }

    // Require subject and difficulty for homework mode
    if (learningMode.focus === 'homework' && (!selectedSubject || !selectedDifficulty)) {
      toast({
        title: "Missing Information",
        description: "Please select subject and grade level for homework help.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: StudyMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
      subject: selectedSubject,
      difficulty: selectedDifficulty,
      learningMode
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const endpoint = learningMode.focus === 'homework' ? '/api/study/homework' : '/api/study/enhanced-learning';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          context: {
            recentMessages: messages.slice(-5),
            learningMode,
            userProfile: learningProfile,
            subject: selectedSubject,
            difficulty: selectedDifficulty,
            familyContext: familyMembers.length > 0 ? familyMembers[0]?.familyId : null
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Handle language corrections
        if (data.corrections?.length > 0) {
          setCorrections(prev => [...prev, ...data.corrections]);
          
          // Show gentle correction notifications
          data.corrections.forEach((correction: any) => {
            toast({
              title: "Learning Tip 💡",
              description: correction.explanation,
              duration: 5000,
              className: "bg-blue-50 border-blue-200"
            });
          });
        }

        // Update session insights
        if (data.sessionInsights) {
          setSessionInsights(data.sessionInsights);
        }

        const aiMessage: StudyMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          learningMode,
          corrections: data.corrections,
          learningInsights: data.learningInsights,
          suggestedFollowUp: data.suggestedFollowUp,
          culturalNotes: data.culturalNotes
        };

        setMessages(prev => [...prev, aiMessage]);

        // Update learning streak if practicing
        if (learningMode.type === 'practice' || learningMode.type === 'immersive') {
          setLearningStreak(prev => prev + 1);
        }
      } else {
        throw new Error(data.error || 'Failed to get study help');
      }
    } catch (error) {
      console.error('Error getting study help:', error);
      toast({
        title: "Error",
        description: "Failed to get study help. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSubjectInfo = (subjectId: string) => {
    return SUBJECTS.find(s => s.id === subjectId);
  };

  const getDifficultyInfo = (difficultyId: string) => {
    return DIFFICULTY_LEVELS.find(d => d.id === difficultyId);
  };

  const getQuickPhrases = (language: string) => {
    const phrases: Record<string, Array<{ text: string; translation: string }>> = {
      vi: [
        { text: "Xin chào!", translation: "Hello!" },
        { text: "Cảm ơn bạn", translation: "Thank you" },
        { text: "Hôm nay thế nào?", translation: "How's today?" }
      ],
      pl: [
        { text: "Dzień dobry!", translation: "Good day!" },
        { text: "Dziękuję", translation: "Thank you" },
        { text: "Jak się masz?", translation: "How are you?" }
      ],
      zh: [
        { text: "你好!", translation: "Hello!" },
        { text: "谢谢", translation: "Thank you" },
        { text: "今天怎么样?", translation: "How's today?" }
      ]
    };
    return phrases[language] || [];
  };

  const getPlaceholder = (mode: LearningMode) => {
    if (mode.focus === 'homework') {
      return "Ask your homework question here... Be specific about what you need help with!";
    }
    if (mode.type === 'practice') {
      const lang = LANGUAGES.find(l => l.code === mode.targetLanguage);
      return `Practice ${lang?.name || mode.targetLanguage}...`;
    }
    return "What would you like to study today?";
  };

  // Learning mode selector
  const renderLearningModeSelector = () => (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Study Mode
        </h3>
        <div className="flex gap-2">
          {(['study', 'practice', 'immersive', 'family'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setLearningMode(prev => ({ ...prev, type: mode }))}
              className={cn(
                "px-3 py-1 rounded-full text-sm transition-all",
                learningMode.type === mode
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-slate-800 hover:bg-purple-100'
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Focus Area */}
        <select
          value={learningMode.focus}
          onChange={(e) => setLearningMode(prev => ({ ...prev, focus: e.target.value as any }))}
          className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
        >
          <option value="homework">Homework Help</option>
          <option value="conversation">Conversation</option>
          <option value="grammar">Grammar</option>
          <option value="vocabulary">Vocabulary</option>
          <option value="culture">Culture</option>
        </select>

        {/* Target Language */}
        <select
          value={learningMode.targetLanguage}
          onChange={(e) => setLearningMode(prev => ({ ...prev, targetLanguage: e.target.value }))}
          className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>

        {/* Difficulty */}
        <select
          value={learningMode.difficulty}
          onChange={(e) => setLearningMode(prev => ({ ...prev, difficulty: e.target.value as any }))}
          className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {learningStreak > 0 && (
        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300 mt-2">
          <Trophy className="w-4 h-4" />
          {learningStreak} day learning streak!
        </div>
      )}
    </div>
  );

  // Corrections panel
  const renderCorrectionsPanel = () => corrections.length > 0 && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed left-4 top-20 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto z-50"
    >
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Learning Notes
      </h4>
      <div className="space-y-3">
        {corrections.slice(-5).map((correction, idx) => (
          <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm">
              <span className="line-through text-red-600">{correction.original}</span>
              <span className="text-green-600 ml-2">→ {correction.corrected}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {correction.explanation}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  // Session insights
  const renderSessionInsights = () => sessionInsights && (
    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        <Target className="w-4 h-4" />
        Session Progress
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Accuracy:</span>
          <span className="ml-2 font-medium">{sessionInsights.accuracy}%</span>
        </div>
        <div>
          <span className="text-gray-600">New concepts:</span>
          <span className="ml-2 font-medium">{sessionInsights.newConcepts || 0}</span>
        </div>
        <div>
          <span className="text-gray-600">Time focused:</span>
          <span className="ml-2 font-medium">{sessionInsights.timeSpent || 0}min</span>
        </div>
        <div>
          <span className="text-gray-600">Understanding:</span>
          <span className="ml-2 font-medium">{sessionInsights.comprehensionScore || 0}/5</span>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout 
      title="Study Assistant" 
      subtitle="Personalized learning help with AI tutoring"
      showHeader={true}
    >
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Quick Tips Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Tips</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Be Specific</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Include details about what you're studying</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Show Your Work</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Share what you've tried for better guidance</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Languages className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Practice Languages</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Switch to practice mode for language learning</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Family Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Study together with family members</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {renderLearningModeSelector()}
          {renderCorrectionsPanel()}
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Help with Your Studies!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose your study mode and ask your questions below.
                </p>

                {/* Subject Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {SUBJECTS.slice(0, 6).map((subject) => {
                    const IconComponent = subject.icon;
                    return (
                      <Card key={subject.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 text-center">
                          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2", subject.color)}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{subject.name}</h4>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <motion.div 
                    key={message.id} 
                    initial={{ opacity: 0, x: message.isUser ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn("flex", message.isUser ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
                      message.isUser 
                        ? "bg-purple-500 text-white" 
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    )}>
                      {!message.isUser && (
                        <div className="flex items-center space-x-2 mb-2">
                          {message.subject && (
                            <Badge variant="secondary" className="text-xs">
                              {getSubjectInfo(message.subject)?.name}
                            </Badge>
                          )}
                          {message.difficulty && (
                            <Badge className={cn("text-xs", getDifficultyInfo(message.difficulty)?.color)}>
                              {getDifficultyInfo(message.difficulty)?.name}
                            </Badge>
                          )}
                          {message.learningMode?.type !== 'study' && (
                            <Badge variant="outline" className="text-xs">
                              {message.learningMode?.type}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Learning insights for assistant messages */}
                      {message.learningInsights && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2 text-xs opacity-80">
                            <Zap className="w-3 h-3" />
                            {message.learningInsights}
                          </div>
                        </div>
                      )}
                      
                      {/* Cultural notes */}
                      {message.culturalNotes && message.culturalNotes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-xs opacity-80">
                            <Globe className="w-3 h-3 inline mr-1" />
                            Cultural context: {message.culturalNotes[0]}
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested follow-up */}
                      {message.suggestedFollowUp && (
                        <button
                          onClick={() => setCurrentMessage(message.suggestedFollowUp!)}
                          className="mt-2 text-xs underline opacity-70 hover:opacity-100"
                        >
                          Try: "{message.suggestedFollowUp}"
                        </button>
                      )}
                      
                      <p className={cn(
                        "text-xs mt-2",
                        message.isUser ? "text-white/70" : "text-gray-500"
                      )}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {renderSessionInsights()}
          
          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="space-y-4">
              {/* Subject and Difficulty Selectors - Only for homework mode */}
              {learningMode.focus === 'homework' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject
                    </label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            <div className="flex items-center space-x-2">
                              <subject.icon className="w-4 h-4" />
                              <span>{subject.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grade Level
                    </label>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Quick phrases for language practice */}
              {learningMode.type === 'practice' && learningMode.targetLanguage !== 'en' && (
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {getQuickPhrases(learningMode.targetLanguage).map((phrase, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMessage(phrase.text)}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-sm whitespace-nowrap hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                      title={phrase.translation}
                    >
                      {phrase.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="flex space-x-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={getPlaceholder(learningMode)}
                  className="flex-1 min-h-[60px] max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !currentMessage.trim()}
                  className="px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Study;

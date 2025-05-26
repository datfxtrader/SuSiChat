import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, BookOpen, Calculator, Microscope, Globe, Palette, Music, Users, 
  Lightbulb, MessageCircle, Star, Clock, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';

interface HomeworkMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  subject?: string;
  difficulty?: string;
}

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: Calculator, color: 'bg-blue-500' },
  { id: 'science', name: 'Science', icon: Microscope, color: 'bg-green-500' },
  { id: 'english', name: 'English', icon: BookOpen, color: 'bg-purple-500' },
  { id: 'history', name: 'History', icon: Globe, color: 'bg-orange-500' },
  { id: 'art', name: 'Art', icon: Palette, color: 'bg-pink-500' },
  { id: 'music', name: 'Music', icon: Music, color: 'bg-indigo-500' },
  { id: 'other', name: 'Other', icon: Users, color: 'bg-gray-500' }
];

const DIFFICULTY_LEVELS = [
  { id: 'elementary', name: 'Elementary (K-5)', color: 'bg-green-100 text-green-800' },
  { id: 'middle', name: 'Middle School (6-8)', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'high', name: 'High School (9-12)', color: 'bg-orange-100 text-orange-800' },
  { id: 'college', name: 'College/University', color: 'bg-red-100 text-red-800' }
];

const HomeworkHelp: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<HomeworkMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedSubject || !selectedDifficulty) {
      toast({
        title: "Missing Information",
        description: "Please fill in your question, subject, and grade level.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: HomeworkMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
      subject: selectedSubject,
      difficulty: selectedDifficulty
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Call the homework help API
      const response = await fetch('/api/homework/help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentMessage,
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          userId: user?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: HomeworkMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          subject: selectedSubject,
          difficulty: selectedDifficulty
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get homework help');
      }
    } catch (error) {
      console.error('Error getting homework help:', error);
      toast({
        title: "Error",
        description: "Failed to get homework help. Please try again.",
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

  return (
    <MainLayout 
      title="Homework Help" 
      subtitle="Get personalized help with your studies"
      showHeader={true}
    >
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Quick Tips Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Tips</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Be Specific</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Include the exact problem or concept you need help with</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Show Your Work</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Share what you've tried so far for better guidance</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Ask Follow-ups</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Don't hesitate to ask for clarification or examples</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Help with Your Homework!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose your subject and grade level, then ask your question below.
                </p>

                {/* Subject Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {SUBJECTS.slice(0, -1).map((subject) => {
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
                  <div key={message.id} className={cn("flex", message.isUser ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.isUser 
                        ? "bg-primary text-primary-foreground" 
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
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.isUser ? "text-primary-foreground/70" : "text-gray-500"
                      )}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
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

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="space-y-4">
              {/* Subject and Difficulty Selectors */}
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

              {/* Message Input */}
              <div className="flex space-x-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your homework question here... Be specific about what you need help with!"
                  className="flex-1 min-h-[60px] max-h-32 resize-none"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !currentMessage.trim() || !selectedSubject || !selectedDifficulty}
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

export default HomeworkHelp;
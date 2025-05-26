
import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarDays, 
  Clock, 
  ExternalLink, 
  Search, 
  TrendingUp, 
  BookOpen,
  CheckCircle,
  Star,
  Globe,
  Brain,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react';
import { usePersonalizedBlog, useTrendingBlog, useReadingTimeTracker, useVocabularyProgress } from '../hooks/useBlog';
import type { BlogPost } from '../hooks/useBlog';

const categories = [
  'All', 
  'Technology', 
  'Science', 
  'Business', 
  'Health', 
  'Environment', 
  'Education',
  'Finance',
  'Entertainment',
  'Sports'
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'vi', name: 'Vietnamese' }
];

const readingLevels = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

const BlogPost: React.FC<{ post: BlogPost; variant?: 'featured' | 'regular' | 'trending' }> = ({ 
  post, 
  variant = 'regular' 
}) => {
  const { startReading } = useReadingTimeTracker(post.id);

  useEffect(() => {
    if (variant === 'featured') {
      const stopTracking = startReading();
      return stopTracking;
    }
  }, [post.id, variant]);

  const difficultyColor = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
  };

  if (variant === 'featured') {
    return (
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {post.isPersonalized ? 'Personalized' : 'Featured'}
                </Badge>
                <Badge variant="outline">{post.category}</Badge>
                <Badge className={`text-xs ${difficultyColor[post.readingLevel]}`}>
                  {post.readingLevel}
                </Badge>
                {post.factChecked && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl mb-3 hover:text-primary transition-colors">
                <Link to={`/blog/${post.id}`} className="block">
                  {post.title}
                </Link>
              </CardTitle>
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                {post.summary}
              </p>
              {post.vocabularyHighlights && post.vocabularyHighlights.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  <span className="text-sm text-muted-foreground mr-2">Vocabulary:</span>
                  {post.vocabularyHighlights.slice(0, 4).map((vocab, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {vocab.word}
                    </Badge>
                  ))}
                  {post.vocabularyHighlights.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{post.vocabularyHighlights.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center justify-center w-20 h-20 bg-primary/10 rounded-lg">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {new Date(post.publishedAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.estimatedReadTime} min read
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {post.language.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {post.category}
          </Badge>
          <Badge className={`text-xs ${difficultyColor[post.readingLevel]}`}>
            {post.readingLevel}
          </Badge>
          {post.isPersonalized && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Star className="w-3 h-3" />
              For You
            </Badge>
          )}
          {post.factChecked && (
            <Badge variant="secondary" className="text-xs gap-1">
              <CheckCircle className="w-3 h-3" />
              {post.factCheckScore && `${Math.round(post.factCheckScore * 100)}%`}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
          <Link to={`/blog/${post.id}`} className="block">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
          {post.summary}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {new Date(post.publishedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.estimatedReadTime} min
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {post.language.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {post.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {post.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{post.tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const VocabularyProgress: React.FC<{ language: string }> = ({ language }) => {
  const { data: progress } = useVocabularyProgress(language);

  if (!progress?.progress?.length) return null;

  const masteredCount = progress.progress.filter((p: any) => p.mastered).length;
  const totalCount = progress.progress.length;
  const masteryPercentage = (masteredCount / totalCount) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Vocabulary Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mastered Words</span>
            <span>{masteredCount}/{totalCount}</span>
          </div>
          <Progress value={masteryPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {Math.round(masteryPercentage)}% mastery rate
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ResearchBlog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('personalized');

  const blogFilters = {
    language: selectedLanguage,
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    personalizedOnly: activeTab === 'personalized'
  };

  const { data: blogData, isLoading: isBlogLoading } = usePersonalizedBlog(blogFilters);
  const { data: trendingData, isLoading: isTrendingLoading } = useTrendingBlog({ 
    language: selectedLanguage 
  });

  const filteredPosts = (blogData?.posts || []).filter((post: BlogPost) => {
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLevel = selectedLevel === 'all' || post.readingLevel === selectedLevel;
    
    return matchesSearch && matchesLevel;
  });

  const featuredPost = filteredPosts.find((post: BlogPost) => post.isPersonalized && post.isTrending);
  const regularPosts = filteredPosts.filter((post: BlogPost) => post !== featuredPost);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Header Section */}
        <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Personalized Blog</h1>
                  <p className="text-muted-foreground mt-1">
                    AI-powered articles tailored to your interests and language level
                  </p>
                </div>
                <Link to="/suna-agent">
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Create Content
                  </Button>
                </Link>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {readingLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="whitespace-nowrap"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="personalized" className="gap-2">
                    <Target className="w-4 h-4" />
                    For You
                  </TabsTrigger>
                  <TabsTrigger value="trending" className="gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personalized" className="mt-6">
                  {isBlogLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-6 bg-muted rounded"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-20 bg-muted rounded"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Featured Article */}
                      {featuredPost && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="secondary" className="gap-1">
                              <Star className="w-3 h-3" />
                              Featured for You
                            </Badge>
                          </div>
                          <BlogPost post={featuredPost} variant="featured" />
                        </div>
                      )}

                      {/* Regular Articles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {regularPosts.map((post: BlogPost) => (
                          <BlogPost key={post.id} post={post} />
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="trending" className="mt-6">
                  {isTrendingLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-6 bg-muted rounded"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-20 bg-muted rounded"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(trendingData?.posts || []).map((post: BlogPost) => (
                        <BlogPost key={post.id} post={post} variant="trending" />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Empty State */}
              {!isBlogLoading && filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or create personalized content.
                  </p>
                  <Link to="/suna-agent">
                    <Button className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate Content
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <VocabularyProgress language={selectedLanguage} />
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Reading Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Articles Read</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Spent</span>
                      <span className="font-medium">2h 45m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Words Learned</span>
                      <span className="font-medium">34</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Articles are personalized based on your interests and reading level. 
                  Interact with content to improve recommendations.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResearchBlog;

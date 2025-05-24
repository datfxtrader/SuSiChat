import React, { useState } from 'react';
import { Link } from 'wouter';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Clock, ExternalLink, Search, TrendingUp, Bitcoin, DollarSign } from 'lucide-react';

interface ResearchPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: string;
  author: string;
  sources: number;
  featured?: boolean;
}

// Sample research posts - in production, these would come from your research system
const samplePosts: ResearchPost[] = [
  {
    id: '1',
    title: 'Bitcoin Price Analysis: Factors Impacting BTC/USD Through End of 2025',
    excerpt: 'Comprehensive analysis of current market conditions, institutional adoption, and regulatory factors affecting Bitcoin price trajectory.',
    content: 'Full research content would be loaded here...',
    category: 'Market Analysis',
    tags: ['Bitcoin', 'Price Forecast', 'Market Trends', '2025'],
    publishedAt: '2025-05-24',
    readTime: '8 min read',
    author: 'DeerFlow AI',
    sources: 15,
    featured: true
  },
  {
    id: '2',
    title: 'Cryptocurrency Market Outlook: Q2 2025 Trends and Predictions',
    excerpt: 'Latest market intelligence on crypto sector performance, institutional investment flows, and regulatory developments.',
    content: 'Full research content would be loaded here...',
    category: 'Crypto Research',
    tags: ['Cryptocurrency', 'Q2 2025', 'Market Outlook'],
    publishedAt: '2025-05-23',
    readTime: '12 min read',
    author: 'DeerFlow AI',
    sources: 22
  },
  {
    id: '3',
    title: 'Federal Reserve Policy Impact on Digital Assets: May 2025 Analysis',
    excerpt: 'Deep dive into how current monetary policy decisions are influencing cryptocurrency valuations and market sentiment.',
    content: 'Full research content would be loaded here...',
    category: 'Economic Analysis',
    tags: ['Federal Reserve', 'Monetary Policy', 'Digital Assets'],
    publishedAt: '2025-05-22',
    readTime: '6 min read',
    author: 'DeerFlow AI',
    sources: 18
  }
];

const categories = ['All', 'Market Analysis', 'Crypto Research', 'Economic Analysis', 'Price Forecasts'];

const ResearchBlog: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = samplePosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = samplePosts.find(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Header Section */}
        <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Research Blog</h1>
                  <p className="text-muted-foreground mt-1">
                    Professional market analysis and research insights powered by advanced AI
                  </p>
                </div>
                <Link to="/suna-agent">
                  <Button variant="outline" className="gap-2">
                    <TrendingUp className="w-4 h-4" />
                    New Research
                  </Button>
                </Link>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search research articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Featured Article */}
          {featuredPost && selectedCategory === 'All' && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Featured Research
                </Badge>
              </div>
              <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{featuredPost.category}</Badge>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(featuredPost.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-2xl mb-3 hover:text-primary transition-colors">
                        <Link to={`/research-blog/${featuredPost.id}`} className="block">
                          {featuredPost.title}
                        </Link>
                      </CardTitle>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center justify-center w-20 h-20 bg-primary/10 rounded-lg">
                      <Bitcoin className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {featuredPost.readTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {featuredPost.sources} sources
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {featuredPost.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <Card key={post.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    <Link to={`/research-blog/${post.id}`} className="block">
                      {post.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {post.sources} sources
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
            ))}
          </div>

          {/* Empty State */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No research found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or category filter.
              </p>
              <Link to="/suna-agent">
                <Button className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Start New Research
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ResearchBlog;
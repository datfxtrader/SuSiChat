
import React, { useState } from 'react';
import { Search, Globe, Newspaper, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSuna } from '../../hooks/useSuna';
import { type EnhancedSearchResponse } from '../../lib/enhancedSearch';

interface EnhancedSearchWidgetProps {
  onResults?: (results: EnhancedSearchResponse) => void;
  className?: string;
}

export function EnhancedSearchWidget({ onResults, className }: EnhancedSearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'web' | 'news' | 'all'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EnhancedSearchResponse | null>(null);

  const { performEnhancedSearch } = useSuna();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const results = await performEnhancedSearch(query, searchType, 10);
      if (results) {
        setSearchResults(results);
        onResults?.(results);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'news': return <Newspaper className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enhanced Web Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Select value={searchType} onValueChange={(value: 'web' | 'news' | 'all') => setSearchType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    All
                  </div>
                </SelectItem>
                <SelectItem value="web">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Web
                  </div>
                </SelectItem>
                <SelectItem value="news">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    News
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                getSearchIcon()
              )}
            </Button>
          </div>

          {searchResults && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Found {searchResults.totalResults} results</span>
                <div className="flex gap-1">
                  {searchResults.searchEnginesUsed.map((engine) => (
                    <Badge key={engine} variant="secondary" className="text-xs">
                      {engine}
                    </Badge>
                  ))}
                </div>
                {searchResults.performance && (
                  <span>in {searchResults.performance.searchTime}ms</span>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.results.map((result, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 line-clamp-2"
                        >
                          {result.title}
                        </a>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {result.source}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{result.domain}</span>
                        {result.publishedDate && (
                          <>
                            <span>•</span>
                            <span>{new Date(result.publishedDate).toLocaleDateString()}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Score: {result.score.toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedSearchWidget;

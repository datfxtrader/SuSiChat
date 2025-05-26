
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  sourceUrls: string[];
  language: string;
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  vocabularyHighlights?: VocabularyItem[];
  grammarPoints?: string[];
  publishedAt: string;
  expiresAt: string;
  isPersonalized: boolean;
  isTrending: boolean;
  factChecked: boolean;
  factCheckScore?: number;
  generationMetadata?: any;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  translation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  example?: string;
}

export interface BlogFilters {
  language?: string;
  category?: string;
  personalizedOnly?: boolean;
}

export function usePersonalizedBlog(filters: BlogFilters = {}) {
  return useQuery({
    queryKey: ['personalizedBlog', filters],
    queryFn: async () => {
      const response = await api.get('/blog/personalized', { params: filters });
      return response.data;
    },
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    refetchOnWindowFocus: false,
  });
}

export function useBlogPost(postId: string) {
  return useQuery({
    queryKey: ['blogPost', postId],
    queryFn: async () => {
      const response = await api.get(`/blog/post/${postId}`);
      return response.data;
    },
    enabled: !!postId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useTrendingBlog(filters: { language?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['trendingBlog', filters],
    queryFn: async () => {
      const response = await api.get('/blog/trending', { params: filters });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrackInteraction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      postId, 
      interactionType, 
      timeSpent, 
      vocabularyLearned 
    }: {
      postId: string;
      interactionType: 'view' | 'click' | 'share' | 'fact_check' | 'dislike';
      timeSpent?: number;
      vocabularyLearned?: string[];
    }) => {
      return api.post(`/blog/${postId}/interact`, {
        interactionType,
        timeSpent,
        vocabularyLearned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalizedBlog'] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyProgress'] });
    }
  });
}

export function useValidatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const response = await api.post(`/blog/${postId}/validate`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blogPost', variables.postId] });
    }
  });
}

export function useUpdateInterests() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (interests: Array<{
      categoryId: string;
      subcategories: string[];
      weight: number;
    }>) => {
      return api.put('/user/interests', { interests });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedBlog'] });
    }
  });
}

export function useVocabularyProgress(language = 'en') {
  return useQuery({
    queryKey: ['vocabularyProgress', language],
    queryFn: async () => {
      const response = await api.get('/user/vocabulary-progress', { 
        params: { language } 
      });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Custom hook for reading time tracking
export function useReadingTimeTracker(postId: string) {
  const trackInteraction = useTrackInteraction();
  
  const startReading = () => {
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent > 10) { // Only track if read for more than 10 seconds
        trackInteraction.mutate({
          postId,
          interactionType: 'view',
          timeSpent
        });
      }
    };
  };
  
  return { startReading };
}

// Hook for vocabulary learning
export function useVocabularyLearning(postId: string) {
  const trackInteraction = useTrackInteraction();
  
  const markWordLearned = (words: string[]) => {
    trackInteraction.mutate({
      postId,
      interactionType: 'view',
      vocabularyLearned: words
    });
  };
  
  return { markWordLearned };
}

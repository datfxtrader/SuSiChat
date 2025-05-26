
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTypewriter } from './useTypewriter';

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  type: 'chat' | 'research';
}

interface UseStreamingTypewriterOptions {
  onComplete?: () => void;
  speed?: number;
  bufferSize?: number; // Characters to buffer before starting typewriter
}

export const useStreamingTypewriter = (
  websocketUrl: string,
  options: UseStreamingTypewriterOptions = {}
) => {
  const {
    onComplete,
    speed = 30,
    bufferSize = 50 // Start typing after 50 chars received
  } = options;

  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [displayContent, setDisplayContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<string>('');
  const typewriterQueueRef = useRef<string[]>([]);
  const isTypingRef = useRef(false);

  // Typewriter for current chunk
  const { 
    displayedText, 
    isTyping, 
    skipToEnd 
  } = useTypewriter(displayContent, {
    speed,
    onComplete: () => {
      isTypingRef.current = false;
      processQueue();
    }
  });

  // Process queued chunks
  const processQueue = useCallback(() => {
    if (typewriterQueueRef.current.length > 0 && !isTypingRef.current) {
      const nextChunk = typewriterQueueRef.current.shift()!;
      isTypingRef.current = true;
      setDisplayContent(prev => prev + nextChunk);
    }
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'stream_start':
          setStreamingMessage({
            id: data.id,
            content: '',
            isComplete: false,
            type: data.responseType || 'chat'
          });
          setIsStreaming(true);
          bufferRef.current = '';
          typewriterQueueRef.current = [];
          break;

        case 'stream_chunk':
          bufferRef.current += data.content;
          
          // Start typewriter after buffer threshold
          if (bufferRef.current.length >= bufferSize && !isTypingRef.current) {
            typewriterQueueRef.current.push(bufferRef.current);
            bufferRef.current = '';
            processQueue();
          }
          
          // Update full content for skip functionality
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: prev.content + data.content
          } : null);
          break;

        case 'stream_end':
          // Push remaining buffer
          if (bufferRef.current) {
            typewriterQueueRef.current.push(bufferRef.current);
            bufferRef.current = '';
          }
          
          setStreamingMessage(prev => prev ? {
            ...prev,
            isComplete: true
          } : null);
          setIsStreaming(false);
          
          // Process remaining queue
          if (!isTypingRef.current) {
            processQueue();
          }
          break;

        case 'error':
          console.error('Stream error:', data.error);
          setIsStreaming(false);
          break;
      }
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
    }
  }, [bufferSize, processQueue]);

  // Initialize WebSocket
  useEffect(() => {
    wsRef.current = new WebSocket(websocketUrl);
    
    wsRef.current.onmessage = handleWebSocketMessage;
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsStreaming(false);
    };
    
    return () => {
      wsRef.current?.close();
    };
  }, [websocketUrl, handleWebSocketMessage]);

  // Skip all animations and show full content
  const skipAll = useCallback(() => {
    skipToEnd();
    if (streamingMessage) {
      setDisplayContent(streamingMessage.content);
      typewriterQueueRef.current = [];
    }
  }, [skipToEnd, streamingMessage]);

  return {
    displayedText,
    fullText: streamingMessage?.content || '',
    isStreaming,
    isTyping: isTyping || typewriterQueueRef.current.length > 0,
    skipAll,
    messageType: streamingMessage?.type
  };
};

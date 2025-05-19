import React, { useState } from 'react';
import { useSuna } from '@/hooks/useSuna';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/utils';

interface SunaChatProps {
  conversationId?: string;
}

export function SunaChat({ conversationId }: SunaChatProps) {
  const [message, setMessage] = useState('');
  const { user, isAuthenticated } = useAuth();
  const { 
    conversation, 
    isLoadingConversation, 
    sendMessage, 
    isSending 
  } = useSuna(conversationId);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessage({ message });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-96">
        <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
        <p className="text-muted-foreground mb-4">
          You need to log in to use the Suna AI Agent.
        </p>
        <Button onClick={() => window.location.href = '/api/login'}>
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoadingConversation ? (
          <div className="flex justify-center items-center h-full">
            <p>Loading conversation...</p>
          </div>
        ) : conversation?.messages?.length ? (
          conversation.messages.map((msg: any, index: number) => (
            <div
              key={msg.id || index}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card
                className={`p-3 max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex flex-col">
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1">
                    {formatRelativeTime(new Date(msg.timestamp))}
                  </span>
                </div>
              </Card>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-xl font-semibold mb-2">Suna AI Agent</h3>
            <p className="text-muted-foreground mb-4">
              Suna is a generalist AI agent that can help you with complex tasks.
              Ask anything to get started!
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Suna to help with a task..."
            className="flex-1 min-h-24 resize-none"
            disabled={isSending}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!message.trim() || isSending}
            className="h-24"
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
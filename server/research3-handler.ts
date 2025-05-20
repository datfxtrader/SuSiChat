/**
 * Research3 Handler - Direct implementation for Suna agent depth level 3 research
 * 
 * This module provides a direct Express handler for /research3 commands in Suna
 */
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { performEnhancedResearch } from './enhanced-research';

/**
 * Extract the query from a /research3 command
 */
function extractQueryFromCommand(message: string): string {
  // Check for explicit research command
  const research3Command = message.match(/^\/research3\s+(.*)/i);
  
  if (research3Command && research3Command[1]) {
    return research3Command[1].trim();
  }
  
  // Return the original message if not a research command
  return message;
}

/**
 * Handle /research3 commands directly for Suna agent integration
 */
export async function handleResearch3Command(req: any, res: Response) {
  try {
    const { message, threadId, model } = req.body;
    const userId = req.user.claims.sub;
    
    // Check if this is a /research3 command
    if (!message || !message.startsWith('/research3 ')) {
      return res.status(400).json({ 
        error: 'Not a /research3 command',
        message: 'This endpoint is only for /research3 commands' 
      });
    }
    
    console.log(`Processing /research3 command: ${message}`);
    
    // Extract the actual research query
    const query = extractQueryFromCommand(message);
    console.log(`Extracted query: ${query}`);
    
    // Perform the enhanced research
    const research = await performEnhancedResearch({
      query,
      maxDepth: 3,
      includeSources: true,
      conversationId: threadId
    });
    
    // Format sources for the response
    const sourcesFormatted = research.sources.map(source => ({
      title: source.title,
      url: source.url,
      content: source.snippet
    }));
    
    // Create the response with research results and sources
    const messageId = uuidv4();
    const responseMessage = {
      id: messageId,
      role: 'assistant',
      content: research.result,
      timestamp: new Date().toISOString(),
      modelUsed: model || 'enhanced-research',
      webSearchUsed: true,
      searchMetadata: {
        query,
        sources: sourcesFormatted.map(s => s.url),
        resultCount: sourcesFormatted.length,
        searchEngines: ['enhanced-research'],
        searchTime: 0,
        sourceDetails: sourcesFormatted.map(s => ({
          title: s.title,
          url: s.url,
          domain: new URL(s.url).hostname
        }))
      }
    };
    
    // Return the research results
    return res.json(responseMessage);
  } catch (error) {
    console.error('Error processing research3 command:', error);
    return res.status(500).json({
      error: 'Failed to process research command',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
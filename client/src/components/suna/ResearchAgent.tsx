ch after reaching 100%
        if (!isCompletingRef.current) {
          isCompletingRef.current = true;
          setTimeout(() => {
            completeResearch();
            isCompletingRef.current = false;
          }, 200);
        }
      }

      setResearchProgress(Math.min(currentProgress, targetProgress));

      // Update stages based on progress
      const progress = Math.min(currentProgress, targetProgress);
      if (progress >= 83) setResearchStage(6);
      else if (progress >= 67) setResearchStage(5);
      else if (progress >= 50) setResearchStage(4);
      else if (progress >= 33) setResearchStage(3);
      else if (progress >= 17) setResearchStage(2);
      else setResearchStage(1);
    }, updateInterval);

    // Failsafe timeout to ensure completion
    progressTimeoutRef.current = setTimeout(() => {
      if (isResearchInProgress) {
        console.log('⚠️ Failsafe triggered - forcing completion');
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setResearchProgress(100);
        setTimeout(() => {
          completeResearch();
        }, 200);
      }
    }, 5000); // 5 seconds total timeout
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewResearch = () => {
    console.log('🔄 Starting new research session');

    // Clear all intervals and timeouts first
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }

    // Then reset all state
    setMessages([]);
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setMessage('');
    setCurrentResearchQuery('');
  };

  const predefinedPrompts = [
    {
      title: "Market Analysis",
      description: "Deep dive into market trends",
      prompt: "Analyze current market trends",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Financial Data",
      description: "Comprehensive metrics analysis",
      prompt: "Generate financial analysis",
      icon: Database,
      gradient: "from-blue-500 to-indigo-600"
    }
  ];

  // Handle completion detection with safeguards
  useEffect(() => {
    let completionTimeout: NodeJS.Timeout | null = null;

    const safeComplete = () => {
      if (completionTimeout) {
        clearTimeout(completionTimeout);
      }
      if (isResearchInProgress) {
        console.log('✅ Research completed at', Math.round(researchProgress), '% - showing results');
        completeResearch();
      }
    };

    // Only attempt completion when research is active but not sending
    if (isResearchInProgress && !isSending) {
      if (researchProgress >= 100) {
        safeComplete();
      } else if (researchProgress >= 90) {
        // Add slight delay to prevent race conditions
        completionTimeout = setTimeout(safeComplete, 500);
      }
    }

    return () => {
      if (completionTimeout) {
        clearTimeout(completionTimeout);
      }
    };
  }, [isResearchInProgress, isSending, researchProgress]);

  // Simplified recovery for stuck states
  useEffect(() => {
    let stuckTimer: NodeJS.Timeout | null = null;

    if (isResearchInProgress && !isSending && researchProgress < 100) {
      stuckTimer = setTimeout(() => {
        console.log('⚡ Progress recovery - completing research');
        setResearchProgress(100);
      }, 3000);
    }

    return () => {
      if (stuckTimer) {
        clearTimeout(stuckTimer);
      }
    };
  }, [isResearchInProgress, isSending, researchProgress]);

  // Add cleanup effect for stale research state
  useEffect(() => {
    if (!isResearchInProgress && progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (!isResearchInProgress && progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
    if (!isResearchInProgress && completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, [isResearchInProgress]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="w-64 border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="p-4 border-b border-zinc-800/60">
          <Button onClick={handleNewResearch} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Research
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !isResearchInProgress && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-4xl mx-auto px-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Bot className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-zinc-100 mb-3">
                  Welcome to Research Agent
                </h1>
                <p className="text-lg text-zinc-400 mb-12">
                  Get comprehensive, AI-powered research on any topic with real-time data
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {predefinedPrompts.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => setMessage(card.prompt)}
                      className="group p-6 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/70 hover:border-zinc-700/70 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  {msg.role === 'user' ? (
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-xl">
                      <div className="prose prose-invert max-w-none">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <ResearchResponse 
                      content={msg.content}
                      timestamp={msg.timestamp}
                      sources={msg.sources}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isResearchInProgress && (
            <div className="mb-4">
              <ResearchProgress 
                stage={researchStage}
                progress={researchProgress}
                query={currentResearchQuery || "Analyzing..."}
                isActive={true}
              />
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <Select value={researchDepth} onValueChange={setResearchDepth} />
              <Select value={selectedModel} onValueChange={setSelectedModel} />
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a research question..."
                className="min-h-[100px] pr-24"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending || isResearchInProgress}
                className="absolute bottom-4 right-4"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
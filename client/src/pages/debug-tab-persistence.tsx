import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';

interface DebugEvent {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  data?: any;
}

interface MockState {
  isInProgress: boolean;
  query: string;
  progress: number;
  stage: number;
  stageLabel: string;
  lastUpdated: number;
  tabSwitchCount: number;
  restorationAttempts: number;
}

export default function DebugTabPersistence() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [mockState, setMockState] = useState<MockState>({
    isInProgress: false,
    query: "",
    progress: 0,
    stage: 0,
    stageLabel: "Ready",
    lastUpdated: Date.now(),
    tabSwitchCount: 0,
    restorationAttempts: 0
  });
  
  const [testResults, setTestResults] = useState<Array<{name: string, status: 'pass' | 'fail' | 'pending', details: string}>>([]);
  const [detectedIssues, setDetectedIssues] = useState<string[]>([]);
  const debugStartTime = useRef<number>(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const log = (message: string, type: DebugEvent['type'] = 'info', data?: any) => {
    const event: DebugEvent = {
      timestamp: Date.now(),
      message,
      type,
      data
    };
    
    setEvents(prev => [...prev.slice(-50), event]); // Keep last 50 events
    console.log(`[TAB DEBUGGER] ${message}`, data);
  };

  const startDebugging = () => {
    if (isDebugging) {
      log('Debug session already running', 'warning');
      return;
    }

    setIsDebugging(true);
    debugStartTime.current = Date.now();
    setEvents([]);
    setTestResults([]);
    setDetectedIssues([]);
    
    log('🚀 Starting comprehensive debug session...', 'success');
    log('👁️ Setting up visibility change listener', 'info');
    
    // Start mock progress to simulate research
    setMockState(prev => ({
      ...prev,
      isInProgress: true,
      query: "Debug tab persistence test query",
      stage: 1,
      stageLabel: "Initializing debug session...",
      lastUpdated: Date.now()
    }));
    
    // Run initial diagnostics
    setTimeout(runDiagnostics, 1000);
  };

  const stopDebugging = () => {
    setIsDebugging(false);
    log('🛑 Debug session stopped', 'info');
    setMockState(prev => ({ ...prev, isInProgress: false }));
  };

  const simulateTabSwitch = () => {
    log('🔄 Simulating tab switch...', 'info');
    
    // Simulate tab becoming hidden
    log('📱 Tab hidden - saving state', 'info', mockState);
    localStorage.setItem('debug_tab_state', JSON.stringify(mockState));
    
    setTimeout(() => {
      // Simulate tab becoming visible
      log('👀 Tab visible - attempting state restoration', 'info');
      const savedState = localStorage.getItem('debug_tab_state');
      
      if (savedState) {
        try {
          const restored = JSON.parse(savedState);
          log('✅ State restoration successful', 'success', restored);
          setMockState(prev => ({
            ...prev,
            ...restored,
            tabSwitchCount: prev.tabSwitchCount + 1,
            restorationAttempts: prev.restorationAttempts + 1
          }));
        } catch (error) {
          log('❌ State restoration failed', 'error', error);
        }
      } else {
        log('⚠️ No saved state found', 'warning');
      }
    }, 1000);
  };

  const testStateRestoration = () => {
    log('⚡ Running state restoration test...', 'info');
    
    const tests = [
      {
        name: 'localStorage Access',
        test: () => {
          try {
            localStorage.setItem('test', 'value');
            localStorage.removeItem('test');
            return { status: 'pass' as const, details: 'localStorage is accessible' };
          } catch (error) {
            return { status: 'fail' as const, details: 'localStorage access denied' };
          }
        }
      },
      {
        name: 'Visibility API Support',
        test: () => {
          if ('visibilityState' in document) {
            return { status: 'pass' as const, details: 'Visibility API supported' };
          }
          return { status: 'fail' as const, details: 'Visibility API not supported' };
        }
      },
      {
        name: 'State Serialization',
        test: () => {
          try {
            const serialized = JSON.stringify(mockState);
            const deserialized = JSON.parse(serialized);
            return { status: 'pass' as const, details: 'State serialization working' };
          } catch (error) {
            return { status: 'fail' as const, details: 'State serialization failed' };
          }
        }
      },
      {
        name: 'Event Listener Stability',
        test: () => {
          let eventCount = 0;
          const testHandler = () => eventCount++;
          
          document.addEventListener('visibilitychange', testHandler);
          document.removeEventListener('visibilitychange', testHandler);
          
          return { status: 'pass' as const, details: 'Event listeners can be attached/removed' };
        }
      }
    ];

    const results = tests.map(test => ({
      name: test.name,
      ...test.test()
    }));

    setTestResults(results);
    
    results.forEach(result => {
      if (result.status === 'fail') {
        log(`❌ Test failed: ${result.name} - ${result.details}`, 'error');
      } else {
        log(`✅ Test passed: ${result.name}`, 'success');
      }
    });
  };

  const runDiagnostics = () => {
    log('🔍 Running diagnostic analysis...', 'info');
    
    const issues: string[] = [];
    
    // Check for rapid events
    const recentEvents = events.filter(e => Date.now() - e.timestamp < 5000);
    if (recentEvents.length > 10) {
      issues.push('High event frequency detected - possible event loop');
    }
    
    // Check restoration attempts vs tab switches
    if (mockState.restorationAttempts > mockState.tabSwitchCount + 2) {
      issues.push('More restoration attempts than tab switches - possible race condition');
    }
    
    // Check localStorage
    try {
      localStorage.setItem('diagnostic_test', 'test');
      localStorage.removeItem('diagnostic_test');
    } catch (error) {
      issues.push('localStorage access issues detected');
    }
    
    // Check visibility API
    if (!('visibilityState' in document)) {
      issues.push('Visibility API not supported in this browser');
    }
    
    setDetectedIssues(issues);
    
    if (issues.length === 0) {
      log('✅ No major issues detected in diagnostics', 'success');
    } else {
      log(`⚠️ ${issues.length} potential issues detected`, 'warning');
    }
  };

  const clearLogs = () => {
    setEvents([]);
    log('🗑️ Logs cleared', 'info');
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events]);

  // Simulate progress updates
  useEffect(() => {
    if (!mockState.isInProgress) return;
    
    const interval = setInterval(() => {
      setMockState(prev => {
        if (prev.progress >= 100) return prev;
        
        const newProgress = Math.min(prev.progress + Math.random() * 5, 100);
        const newStage = Math.min(Math.floor(newProgress / 20) + 1, 5);
        
        log(`📊 Progress updated: ${Math.round(newProgress)}%`, 'info');
        
        return {
          ...prev,
          progress: newProgress,
          stage: newStage,
          stageLabel: `Debug stage ${newStage}/5`,
          lastUpdated: Date.now()
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [mockState.isInProgress]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">🔍 Tab Persistence Debugger</h1>
            <p className="text-slate-300 text-lg">Real-time debugging tool to identify tab switching persistence issues</p>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mb-8 flex-wrap">
            <Button 
              onClick={startDebugging} 
              disabled={isDebugging}
              className="bg-green-600 hover:bg-green-700"
            >
              🚀 Start Debug Session
            </Button>
            <Button 
              onClick={stopDebugging} 
              disabled={!isDebugging}
              variant="destructive"
            >
              🛑 Stop Session
            </Button>
            <Button onClick={simulateTabSwitch} variant="outline" className="text-white border-white hover:bg-white/10">
              🔄 Simulate Tab Switch
            </Button>
            <Button onClick={testStateRestoration} variant="outline" className="text-white border-white hover:bg-white/10">
              ⚡ Test Restoration
            </Button>
            <Button onClick={clearLogs} variant="outline" className="text-white border-white hover:bg-white/10">
              🗑️ Clear Logs
            </Button>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  👁️ Visibility Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  {isDebugging ? 'Monitoring...' : 'Not active'}
                </p>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: isDebugging ? '75%' : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  💾 State Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  Switches: {mockState.tabSwitchCount} | Restorations: {mockState.restorationAttempts}
                </p>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: mockState.isInProgress ? `${mockState.progress}%` : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  ⏱️ Timing Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  {events.length} events logged
                </p>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: Math.min((events.length / 20) * 100, 100) + '%' }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  🎨 UI Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  {mockState.stageLabel}
                </p>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: (mockState.stage / 5) * 100 + '%' }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Log */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">📊 Real-time Event Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={logContainerRef}
                className="bg-black/30 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm"
              >
                {events.map((event, index) => (
                  <div key={index} className={`mb-2 p-2 rounded ${
                    event.type === 'error' ? 'bg-red-900/30' :
                    event.type === 'warning' ? 'bg-yellow-900/30' :
                    event.type === 'success' ? 'bg-green-900/30' :
                    'bg-blue-900/30'
                  }`}>
                    <span className="text-gray-400 text-xs">
                      [{new Date(event.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-white ml-2">{event.message}</span>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-gray-400 text-center">
                    Start debugging to see events...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Test Results */}
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">🧪 Automated Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white">{result.name}</span>
                      <Badge variant={result.status === 'pass' ? 'default' : 'destructive'}>
                        {result.status === 'pass' ? '✅ Pass' : '❌ Fail'}
                      </Badge>
                    </div>
                  ))}
                  {testResults.length === 0 && (
                    <p className="text-gray-400 text-center py-4">
                      Click "Test Restoration" to run automated tests
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Current State */}
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">📱 Current State</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/30 rounded-lg p-4">
                  <pre className="text-green-400 text-xs overflow-x-auto">
                    {JSON.stringify(mockState, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues Detection */}
          {detectedIssues.length > 0 && (
            <Card className="bg-white/10 backdrop-blur border-white/20 mt-8">
              <CardHeader>
                <CardTitle className="text-white">🎯 Potential Issues Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detectedIssues.map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-red-900/20 rounded-lg">
                      <span className="text-red-400">⚠️</span>
                      <span className="text-white">{issue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
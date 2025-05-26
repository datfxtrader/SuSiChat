
export const TypewriterConfig = {
  // Speed presets (ms per character)
  speeds: {
    slow: 50,
    normal: 30,    // Claude-like speed
    fast: 20,
    research: 15,  // Faster for longer content
    code: 10       // Very fast for code blocks
  },

  // Feature flags
  features: {
    enableSkipOnDoubleClick: true,
    enableSkipButton: true,
    showCursor: true,
    preserveMarkdownFormatting: true,
    smoothScrolling: true,
    enableSoundEffects: true,
    enableErrorRecovery: true,
    enableProgressBar: true
  },

  // Sound settings
  sound: {
    enabled: true,
    volume: 0.3,
    keyInterval: 3, // Play sound every N characters
    sounds: {
      key: 'typewriter-key',
      bell: 'typewriter-bell',
      complete: 'complete'
    }
  },

  // Error handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true,
    showErrorMessages: true
  },

  // WebSocket settings
  websocket: {
    bufferSize: 50,
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000
  },

  // Response type configurations
  responseTypes: {
    chat: {
      speed: 30,
      showCursor: true,
      enableMarkdown: true,
      enableSound: true,
      robust: false
    },
    research: {
      speed: 20,
      showCursor: true,
      enableMarkdown: true,
      showProgressBar: true,
      enableSound: true,
      robust: true
    },
    error: {
      speed: 0, // Instant for errors
      showCursor: false,
      enableMarkdown: false,
      enableSound: false,
      robust: false
    },
    streaming: {
      speed: 25,
      bufferSize: 100,
      enableSound: true,
      showProgress: true
    }
  }
};

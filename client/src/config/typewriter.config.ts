
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
    smoothScrolling: true
  },

  // Response type configurations
  responseTypes: {
    chat: {
      speed: 30,
      showCursor: true,
      enableMarkdown: true
    },
    research: {
      speed: 20,
      showCursor: true,
      enableMarkdown: true,
      showProgressBar: true
    },
    error: {
      speed: 0, // Instant for errors
      showCursor: false,
      enableMarkdown: false
    }
  }
};

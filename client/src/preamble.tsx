
import React from 'react';

// This preamble file helps @vitejs/plugin-react detect React usage
// It ensures proper JSX transformation and React detection

export const ReactPreamble = () => {
  return React.createElement('div', { 
    style: { display: 'none' } 
  }, 'React preamble loaded');
};

// Export React for compatibility
export default React;

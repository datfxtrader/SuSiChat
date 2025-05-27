
/** @jsx React.createElement */
import React from 'react';

// This JSX file helps @vitejs/plugin-react detect React usage properly
const ReactDetector = () => {
  return React.createElement('div', { 
    style: { display: 'none' } 
  }, 'React JSX Detection Helper');
};

export default ReactDetector;

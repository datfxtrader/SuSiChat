
/** @jsx React.createElement */
import React from 'react';

// This file ensures @vitejs/plugin-react can detect React usage
// The JSX pragma above helps the plugin identify React components

const Preamble: React.FC = () => {
  return React.createElement('div', { style: { display: 'none' } }, 'React preamble loaded');
};

export default Preamble;

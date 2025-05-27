import React from 'react';

// Simple component to help React plugin detect JSX preamble
const ReactPreamble: React.FC = () => {
  return <div style={{ display: 'none' }}>React Preamble Helper</div>;
};

export default ReactPreamble;
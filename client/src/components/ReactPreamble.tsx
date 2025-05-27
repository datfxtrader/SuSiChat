
import React from 'react';

// This component helps Vite's React plugin detect JSX usage
const ReactPreamble: React.FC = () => {
  return <div style={{ display: 'none' }}>React Detected</div>;
};

export default ReactPreamble;

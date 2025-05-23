
import { writeFileSync, readFileSync, existsSync } from 'fs';

const errorRate = {
  visualizations: 0,
  searches: 0,
  responses: 0
};

export function trackError(type: 'visualization' | 'search' | 'response') {
  errorRate[type] = (errorRate[type] || 0) + 1;
  saveErrorStats();
}

function saveErrorStats() {
  writeFileSync('error-stats.json', JSON.stringify(errorRate));
}

export function getErrorStats() {
  return errorRate;
}

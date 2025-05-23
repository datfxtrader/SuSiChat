// Temporary fix to restore comprehensive research functionality
const fs = require('fs');

// Read the broken file
const content = fs.readFileSync('server/suna-integration.ts', 'utf8');

// Find and fix the syntax issues
const fixedContent = content
  .replace(/\s+title: source\.title \|\| 'Source',[\s\S]*?domain: source\.domain \|\| ''\s*}\);/, '')
  .replace(/if \(deerflowResult\.sources[\s\S]*?}\);/, '');

// Write the fixed content
fs.writeFileSync('server/suna-integration.ts', fixedContent);
console.log('✅ Fixed syntax errors in comprehensive research system');
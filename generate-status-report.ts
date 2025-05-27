
import { SystemStatusReporter } from './server/system-status-reporter';

async function main() {
  console.log('🔍 Generating comprehensive system status report...');
  
  const reporter = new SystemStatusReporter();
  const status = await reporter.generateReport();
  
  reporter.printSummary(status);
  
  // Additional analysis based on test reports
  const testSummary = analyzeTestResults(status.test_results);
  if (testSummary) {
    console.log('\n📈 TEST SUMMARY ANALYSIS:');
    console.log(testSummary);
  }
}

function analyzeTestResults(testResults: any[]): string | null {
  if (testResults.length === 0) return null;
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const result of testResults) {
    if (result.summary) {
      totalTests += result.summary.total_tests || result.summary.total || 0;
      passedTests += result.summary.passed || 0;
      failedTests += result.summary.failed || 0;
    }
  }
  
  if (totalTests === 0) return null;
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  return `   Total Tests: ${totalTests}
   Passed: ${passedTests}
   Failed: ${failedTests}
   Success Rate: ${successRate}%`;
}

main().catch(console.error);

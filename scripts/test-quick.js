#!/usr/bin/env node

/**
 * Quick test runner to check specific test fixes
 */

const { execSync } = require('child_process');

function runTest(testPattern, description) {
  console.log(`\n🧪 ${description}`);
  console.log('=' .repeat(50));
  
  try {
    const result = execSync(`npm test -- --testPathPattern="${testPattern}" --verbose`, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    console.log('✅ PASSED');
    console.log(result);
    return true;
  } catch (error) {
    console.log('❌ FAILED');
    console.log(error.stdout);
    console.log(error.stderr);
    return false;
  }
}

function main() {
  console.log('🚀 Testing Active Bets Components\n');
  
  const tests = [
    { pattern: 'ActiveBetCard.test.tsx', description: 'ActiveBetCard Component Tests' },
    { pattern: 'ActiveBets.test.tsx', description: 'ActiveBets Container Tests' }
  ];
  
  let passed = 0;
  
  tests.forEach(test => {
    if (runTest(test.pattern, test.description)) {
      passed++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed}/${tests.length} test suites passed`);
  
  if (passed === tests.length) {
    console.log('🎉 All tests are now passing!');
    process.exit(0);
  } else {
    console.log('❌ Some tests still failing. Check output above.');
    process.exit(1);
  }
}

main();

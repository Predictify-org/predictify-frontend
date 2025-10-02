#!/usr/bin/env node

/**
 * Validation script for Active Bets implementation
 * Checks that all required files exist and are properly structured
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Core components
  'components/active-bets/ActiveBets.tsx',
  'components/active-bets/ActiveBetCard.tsx',
  'components/active-bets/index.ts',
  
  // Types and data
  'lib/types.ts',
  'lib/mock-data.ts',
  
  // Dashboard integration
  'app/(dashboard)/bets/page.tsx',
  
  // Tests
  'components/active-bets/__tests__/ActiveBets.test.tsx',
  'components/active-bets/__tests__/ActiveBetCard.test.tsx',
  
  // Configuration
  'jest.config.js',
  'jest.setup.js',
];

const requiredDependencies = [
  '@radix-ui/react-toast',
  'sonner',
  'lucide-react',
  'next',
  'react',
  'tailwindcss',
];

function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing file: ${filePath}`);
    return false;
  }
  console.log(`Found: ${filePath}`);
  return true;
}

function checkPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.error('package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  let allFound = true;
  requiredDependencies.forEach(dep => {
    if (!allDeps[dep]) {
      console.error(`Missing dependency: ${dep}`);
      allFound = false;
    } else {
      console.log(`Dependency found: ${dep}`);
    }
  });
  
  return allFound;
}

function validateTypeDefinitions() {
  const typesPath = path.join(process.cwd(), 'lib/types.ts');
  if (!fs.existsSync(typesPath)) {
    return false;
  }
  
  const content = fs.readFileSync(typesPath, 'utf8');
  const requiredTypes = ['Bet', 'BetCategory', 'CategoryColor', 'ActiveBetsProps'];
  
  let allFound = true;
  requiredTypes.forEach(type => {
    if (!content.includes(`interface ${type}`) && !content.includes(`type ${type}`)) {
      console.error(`Missing type definition: ${type}`);
      allFound = false;
    } else {
      console.log(`Type definition found: ${type}`);
    }
  });
  
  return allFound;
}

function validateComponents() {
  const componentsPath = path.join(process.cwd(), 'components/active-bets/index.ts');
  if (!fs.existsSync(componentsPath)) {
    return false;
  }
  
  const content = fs.readFileSync(componentsPath, 'utf8');
  const requiredExports = ['ActiveBets', 'ActiveBetCard'];
  
  let allFound = true;
  requiredExports.forEach(exportName => {
    if (!content.includes(exportName)) {
      console.error(`Missing export: ${exportName}`);
      allFound = false;
    } else {
      console.log(`Export found: ${exportName}`);
    }
  });
  
  return allFound;
}

function main() {
  console.log('Validating Active Bets implementation...\n');
  
  console.log('Checking required files:');
  const filesValid = requiredFiles.every(checkFile);
  
  console.log('\nChecking dependencies:');
  const depsValid = checkPackageJson();
  
  console.log('\nValidating type definitions:');
  const typesValid = validateTypeDefinitions();
  
  console.log('\nValidating component exports:');
  const exportsValid = validateComponents();
  
  console.log('\n' + '='.repeat(50));
  
  if (filesValid && depsValid && typesValid && exportsValid) {
    console.log('All validations passed! Implementation is complete.');
    console.log('\n Next steps:');
    console.log('1. Run: pnpm install');
    console.log('2. Run: pnpm dev');
    console.log('3. Navigate to: /bets');
    console.log('4. Test the Active Bets functionality');
    process.exit(0);
  } else {
    console.log('Some validations failed. Please check the errors above.');
    process.exit(1);
  }
}

main();

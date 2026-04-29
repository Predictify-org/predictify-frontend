#!/usr/bin/env node

/**
 * Security Workflow Validation Script
 * 
 * This script validates the security workflow configuration and can be run locally
 * to mirror CI checks before pushing changes.
 * 
 * Usage: node scripts/validate-security.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
let warnings = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function warn(condition, message) {
  if (!condition) {
    console.log(`  ⚠ ${message}`);
    warnings++;
  }
}

console.log('🔒 Security Workflow Validation\n');

// 1. Validate security-exemptions.json
console.log('📋 Validating security-exemptions.json...');
try {
  const exemptionsPath = path.join(rootDir, '.github', 'security-exemptions.json');
  const exemptionsData = fs.readFileSync(exemptionsPath, 'utf8');
  const exemptions = JSON.parse(exemptionsData);

  assert(exemptions.metadata, 'Has metadata section');
  assert(exemptions.metadata.version, 'Has version in metadata');
  assert(exemptions.exemptions && Array.isArray(exemptions.exemptions), 'Has exemptions array');
  assert(exemptions.policy, 'Has policy section');
  
  // Validate policy
  if (exemptions.policy) {
    assert(exemptions.policy.max_expiry_days <= 90, 'Max expiry days ≤ 90');
    assert(exemptions.policy.auto_renewal === false, 'Auto-renewal disabled');
    assert(exemptions.policy.requires_review === true, 'Review required');
  }

  // Validate each exemption
  if (exemptions.exemptions) {
    exemptions.exemptions.forEach((ex, idx) => {
      assert(ex.id, `Exemption ${idx + 1} has ID`);
      assert(ex.reason && ex.reason.length > 10, `Exemption ${idx + 1} has detailed reason`);
      assert(ex.expiry_date, `Exemption ${idx + 1} has expiry date`);
      
      if (ex.expiry_date) {
        const expiry = new Date(ex.expiry_date);
        const now = new Date();
        const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
        
        if (daysUntilExpiry < 0) {
          console.log(`    ⚠ Exemption ${ex.id} has EXPIRED (${ex.expiry_date})`);
          warnings++;
        } else if (daysUntilExpiry < 14) {
          console.log(`    ⚠ Exemption ${ex.id} expires in ${Math.floor(daysUntilExpiry)} days`);
          warnings++;
        }
      }
    });
  }

  console.log('');
} catch (error) {
  console.log(`  ✗ Failed to validate exemptions file: ${error.message}\n`);
  failed++;
}

// 2. Validate security.yml workflow
console.log('🔧 Validating security.yml workflow...');
try {
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'security.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  assert(workflowContent.includes('name: Security Scans'), 'Has workflow name');
  assert(workflowContent.includes('pull_request:'), 'Runs on pull requests');
  assert(workflowContent.includes('branches: [main]'), 'Targets main branch');
  assert(workflowContent.includes('schedule:'), 'Has scheduled runs');
  assert(workflowContent.includes('cron:'), 'Has cron schedule');
  
  // Check for critical jobs
  assert(workflowContent.includes('codeql:'), 'Has CodeQL job');
  assert(workflowContent.includes('dependency-scan:'), 'Has dependency scan job');
  assert(workflowContent.includes('container-scan:'), 'Has container scan job');
  assert(workflowContent.includes('security-summary:'), 'Has security summary job');
  
  // Verify NO continue-on-error on critical checks
  const hasContinueOnErrorOnAudit = workflowContent.includes('npm audit') && 
                                     workflowContent.includes('continue-on-error: true');
  assert(!hasContinueOnErrorOnAudit, 'No continue-on-error on npm audit');
  
  // Verify permissions
  assert(workflowContent.includes('security-events: write'), 'Has security-events permission');
  assert(workflowContent.includes('pull-requests: write'), 'Has pull-requests permission');
  
  // Verify it blocks on criticals
  assert(workflowContent.includes('process.exit(1)'), 'Exits with error on critical vulns');
  assert(workflowContent.includes('blockedVulns.length > 0'), 'Checks for blocked vulnerabilities');
  
  console.log('');
} catch (error) {
  console.log(`  ✗ Failed to validate workflow file: ${error.message}\n`);
  failed++;
}

// 3. Validate CI workflow
console.log('🔧 Validating ci.yml workflow...');
try {
  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  const ciContent = fs.readFileSync(ciPath, 'utf8');

  assert(ciContent.includes('name: CI'), 'Has CI workflow name');
  assert(ciContent.includes('npm ci'), 'Uses npm ci for installation');
  assert(ciContent.includes('npm run build'), 'Runs build');
  assert(ciContent.includes('npm test'), 'Runs tests');
  
  console.log('');
} catch (error) {
  console.log(`  ✗ Failed to validate CI workflow: ${error.message}\n`);
  failed++;
}

// 4. Check for npm audit capability
console.log('📦 Checking npm audit capability...');
try {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  assert(packageJson.dependencies || packageJson.devDependencies, 'Has dependencies');
  
  const lockfilePath = path.join(rootDir, 'package-lock.json');
  const hasLockfile = fs.existsSync(lockfilePath);
  assert(hasLockfile, 'Has package-lock.json for accurate auditing');
  
  if (!hasLockfile) {
    console.log('    ⚠ Run `npm install` to generate package-lock.json');
  }
  
  console.log('');
} catch (error) {
  console.log(`  ✗ Failed to check npm configuration: ${error.message}\n`);
  failed++;
}

// 5. Documentation checks
console.log('📚 Validating documentation...');
try {
  const readmePath = path.join(rootDir, 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  assert(readmeContent.includes('Security Scans'), 'README mentions security scans');
  assert(readmeContent.includes('CodeQL'), 'README documents CodeQL');
  assert(readmeContent.includes('npm audit'), 'README documents npm audit');
  
  const securityDocPath = path.join(rootDir, 'docs', 'SECURITY-CI-SETUP.md');
  const hasSecurityDoc = fs.existsSync(securityDocPath);
  assert(hasSecurityDoc, 'Has SECURITY-CI-SETUP.md documentation');
  
  if (hasSecurityDoc) {
    const securityDoc = fs.readFileSync(securityDocPath, 'utf8');
    assert(securityDoc.includes('Branch Protection'), 'Docs include branch protection guide');
    assert(securityDoc.includes('exemptions'), 'Docs explain exemptions');
  }
  
  console.log('');
} catch (error) {
  console.log(`  ✗ Failed to validate documentation: ${error.message}\n`);
  failed++;
}

// Summary
console.log('═'.repeat(50));
console.log(`\n📊 Validation Summary:`);
console.log(`  ✓ Passed:   ${passed}`);
console.log(`  ✗ Failed:   ${failed}`);
console.log(`  ⚠ Warnings: ${warnings}`);
console.log('');

if (failed > 0) {
  console.log('❌ Validation FAILED - Fix issues before committing');
  process.exit(1);
} else {
  console.log('✅ All validations PASSED');
  if (warnings > 0) {
    console.log(`   (${warnings} warning(s) to review)`);
  }
  process.exit(0);
}

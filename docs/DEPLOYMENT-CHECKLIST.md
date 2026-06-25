# Security CI Deployment Checklist

## Pre-Deployment Verification

### ✅ Workflow Files
- [x] `.github/workflows/security.yml` - Enhanced with proper blocking
- [x] `.github/workflows/ci.yml` - Standard CI workflow present
- [x] No `continue-on-error: true` on critical security checks
- [x] Proper permissions set for all jobs
- [x] Workflow triggers configured (PR, push, schedule)

### ✅ Configuration Files
- [x] `.github/security-exemptions.json` - Valid JSON structure
- [x] Exemptions have expiry dates
- [x] Policy section present with max 90-day expiry
- [x] Auto-renewal disabled

### ✅ Documentation
- [x] `README.md` - Updated with security section
- [x] `docs/SECURITY-CI-SETUP.md` - Admin setup guide
- [x] `docs/SECURITY-SCANNING-GUIDE.md` - Security concepts guide
- [x] `docs/IMPLEMENTATION-SUMMARY.md` - Implementation details
- [x] `.github/PULL_REQUEST_TEMPLATE.md` - Security-focused template
- [x] `scripts/validate-security.mjs` - Validation script

## Deployment Steps

### Step 1: Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b ci/security-gates
```

### Step 2: Stage Changes
```bash
git add .github/workflows/security.yml
git add .github/security-exemptions.json
git add README.md
git add docs/SECURITY-CI-SETUP.md
git add docs/SECURITY-SCANNING-GUIDE.md
git add docs/IMPLEMENTATION-SUMMARY.md
git add .github/PULL_REQUEST_TEMPLATE.md
git add scripts/validate-security.mjs
```

### Step 3: Commit
```bash
git commit -m "ci(security): add SAST, dependency, and image scans with policy for criticals

Implement comprehensive CI security gates aligned with fintech expectations:

- CodeQL SAST for static analysis of JavaScript/TypeScript
- npm audit for dependency vulnerability scanning
- Trivy container scanning (conditional on Dockerfile)
- Block merges on CRITICAL vulnerabilities unless exempted
- Exemptions require justification, expiry date (max 90 days)
- PR comments with advisory links and vulnerability tables
- Nightly automated scanning with issue creation
- Slack notifications on failures
- Comprehensive documentation for admins and developers
- Validation script for local testing

Security notes:
- All three scanning layers are complementary (SAST ≠ runtime)
- Payment stream code paths must pass all security gates
- No silent continue-on-error on critical vulnerabilities
- Exemptions tracked with expiry and review requirements
- Auth, keys, PII, and chain settlement considerations documented

Docs: docs/SECURITY-CI-SETUP.md, docs/SECURITY-SCANNING-GUIDE.md
Validation: scripts/validate-security.mjs
Template: .github/PULL_REQUEST_TEMPLATE.md"
```

### Step 4: Push
```bash
git push origin ci/security-gates
```

### Step 5: Create Pull Request
- Navigate to GitHub repository
- Create PR from `ci/security-gates` → `main`
- Fill out PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
- Attach test output if available
- Request review from security team

### Step 6: Verify CI Runs
- [ ] Security workflow starts automatically
- [ ] CodeQL SAST job completes
- [ ] Dependency scan job completes
- [ ] Container scan job skipped (no Dockerfile) OR completes (if Dockerfile added)
- [ ] Security summary comment appears on PR
- [ ] All jobs show green checkmarks

### Step 7: Configure Branch Protection (Admin Required)
1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Required approving reviews: 1
   - ✅ Dismiss stale pull request approvals
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators
4. **Required status checks**:
   - `build-test`
   - `CodeQL SAST`
   - `Dependency Security Audit`
   - `Container Security Scan` (optional - only if Dockerfile exists)
5. Save changes

### Step 8: Test Branch Protection
- [ ] Create test PR without security checks passing
- [ ] Verify merge button is disabled
- [ ] Verify status check requirements are shown
- [ ] Merge after all checks pass

## Post-Deployment Validation

### Week 1 Monitoring
- [ ] Monitor all PRs for security check failures
- [ ] Check for false positives in CodeQL
- [ ] Verify npm audit results are accurate
- [ ] Ensure PR comments are properly formatted
- [ ] Check nightly runs execute at 2 AM UTC

### Exemptions Management
- [ ] Review existing exemptions in `.github/security-exemptions.json`
- [ ] Set calendar reminders for expiry dates (14 days before)
- [ ] Establish process for exemption requests
- [ ] Document exemption review decisions

### Team Communication
- [ ] Announce security CI implementation to team
- [ ] Share `docs/SECURITY-SCANNING-GUIDE.md` with developers
- [ ] Share `docs/SECURITY-CI-SETUP.md` with admins
- [ ] Conduct brief training session on exemptions process
- [ ] Explain how to run `scripts/validate-security.mjs` locally

## Troubleshooting Quick Reference

### Issue: Workflow not appearing in PR checks
**Solution**: 
- Ensure workflow has run at least once
- Check workflow file syntax
- Verify branch protection is configured

### Issue: npm audit fails on PR
**Solution**:
- Run `npm audit` locally to see details
- Check if vulnerability has fix available
- If no fix, add exemption with justification
- Update `package-lock.json` after fixes

### Issue: CodeQL finds security issues
**Solution**:
- Review CodeQL alerts in Security tab
- Fix actual vulnerabilities in code
- For false positives, add inline comments
- Update CodeQL config if needed

### Issue: Container scan fails
**Solution**:
- Review Trivy results in SARIF format
- Update base image to latest version
- Fix OS-level vulnerabilities
- Add exemption if necessary

## Security Contacts

- **Security Team**: [Contact information]
- **Repository Admins**: [List of admins]
- **Escalation Path**: [Process for urgent security issues]

## Success Metrics

### Week 1
- [ ] All PRs have security checks running
- [ ] Branch protection enforced
- [ ] No merges without passing security gates
- [ ] Team aware of new process

### Month 1
- [ ] Zero critical vulnerabilities in production
- [ ] All exemptions documented with expiry dates
- [ ] Nightly scans running successfully
- [ ] Team comfortable with exemption process

### Ongoing
- [ ] Security scans remain reliable (not flaky)
- [ ] Exemptions reviewed before expiry
- [ ] New vulnerabilities addressed promptly
- [ ] Documentation kept up to date

## Rollback Plan

If critical issues are discovered:

1. **Disable branch protection requirement** (temporarily)
   - Go to Settings → Branches → Edit rule
   - Uncheck "Require status checks to pass"
   - Save

2. **Fix the issue**
   - Create hotfix branch
   - Address the problem
   - Test thoroughly

3. **Re-enable branch protection**
   - Re-check "Require status checks to pass"
   - Verify workflow is working
   - Resume normal operations

**Note**: Do NOT disable security workflows entirely. Only relax branch protection temporarily if needed.

## Sign-Off

- [ ] Developer: ________________ Date: ________
- [ ] Security Review: ________________ Date: ________
- [ ] Admin Approval: ________________ Date: ________
- [ ] Branch Protection Configured: ________________ Date: ________

---

**Deployment Status**: Ready for PR  
**Risk Level**: Low (adds security checks, doesn't modify application code)  
**Rollback Risk**: Minimal (can disable branch protection if needed)  
**Documentation**: Complete  

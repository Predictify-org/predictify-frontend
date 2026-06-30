## Security Changes

### Type of Security Change
- [ ] SAST rule update
- [ ] Dependency vulnerability fix
- [ ] Exemption addition/renewal
- [ ] Security workflow modification
- [ ] Container image update
- [ ] Other: _______________

### Vulnerability Details (if applicable)

**CVE/Advisory ID:** 
- CVE-ID: 
- GHSA-ID: 

**Affected Package:**
- Name: 
- Version: 
- Severity: [ ] Critical [ ] High [ ] Medium [ ] Low

**Fix Applied:**
- [ ] Package version bump
- [ ] Code change to mitigate
- [ ] Configuration update
- [ ] Exemption granted (see below)

### Exemption Request (if applicable)

**Exemption ID:** EXEMPT-___

**Justification:**
<!-- Detailed reason why this vulnerability can be temporarily exempted -->

**Mitigation Applied:**
<!-- What compensating controls or workarounds are in place -->

**Expiry Date:** YYYY-MM-DD (max 90 days from now)

**Review Plan:**
<!-- How and when this will be re-evaluated -->

### Testing

- [ ] Ran `npm audit` locally - output attached or no new vulnerabilities
- [ ] Security workflow passes on this branch
- [ ] Test suite passes: `npm test`
- [ ] Build succeeds: `npm run build`

### Security Impact Analysis

**Affected Components:**
- [ ] Authentication/Authorization
- [ ] Payment processing
- [ ] Data encryption
- [ ] API endpoints
- [ ] Dependencies
- [ ] Container images
- [ ] CI/CD pipeline
- [ ] Other: _______________

**Risk Assessment:**
<!-- Describe any potential security risks introduced or mitigated by this change -->

### Documentation Updates

- [ ] Updated README.md (if workflow changed)
- [ ] Updated SECURITY-CI-SETUP.md (if process changed)
- [ ] Updated security-exemptions.json (if applicable)
- [ ] Added security notes to code comments

### Checklist

- [ ] No secrets or keys committed
- [ ] No PII or sensitive data in logs
- [ ] All security scans pass (or exemptions documented)
- [ ] Branch protection requirements met
- [ ] Code review from security team (for critical changes)

### Additional Notes

<!-- Any additional context, links to advisories, or relevant discussions -->

### Test Output

```
# Paste npm test output here
npm test

# Paste npm audit output here (if relevant)
npm audit
```

### CI Run Link

<!-- Link to passing GitHub Actions run -->
Workflow Run: 

---

**Security Review Required:** @security-team
**Compliance Impact:** [Yes/No - explain if yes]

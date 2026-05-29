# Security Scanning Guide: SAST vs Runtime Vulnerabilities

## Overview

StreamPay implements multiple layers of security scanning to protect against different types of vulnerabilities. Understanding the distinction between these scanning approaches is critical for fintech applications handling payment streams and money movement.

## Security Scanning Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Application Security                   │
├─────────────────────────────────────────────────────────┤
│  Layer 1: SAST (Static Analysis)                        │
│  - Scans: Source code                                   │
│  - Finds: Logic flaws, injection, auth bypass           │
│  - Tool: CodeQL                                         │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Dependency Scanning (SCA)                     │
│  - Scans: package-lock.json                             │
│  - Finds: Known CVEs in third-party libraries           │
│  - Tool: npm audit                                      │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Container Scanning                            │
│  - Scans: Docker image layers                           │
│  - Finds: OS vulnerabilities, base image issues         │
│  - Tool: Trivy                                          │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Runtime Protection (Future)                   │
│  - Scans: Running application                           │
│  - Finds: Runtime exploits, memory corruption           │
│  - Tool: RASP, DAST (not yet implemented)               │
└─────────────────────────────────────────────────────────┘
```

## 1. SAST - Static Application Security Testing

### What It Does
SAST analyzes **your source code** without executing it. It uses pattern matching, data flow analysis, and taint tracking to find security vulnerabilities.

### What It Finds
- **SQL Injection**: Unsanitized user input reaching database queries
- **XSS (Cross-Site Scripting)**: Unescaped output to browser
- **Authentication Bypass**: Flawed authorization logic
- **Cryptographic Issues**: Weak algorithms, hardcoded keys
- **Input Validation**: Missing sanitization on user inputs
- **API Security**: Exposed endpoints, missing rate limiting

### Example CodeQL Detection
```typescript
// ❌ CodeQL would flag this
app.post('/transfer', (req, res) => {
  const amount = req.body.amount; // User input
  db.execute(`UPDATE accounts SET balance = balance - ${amount}`); // SQL injection!
});

// ✅ Safe version
app.post('/transfer', (req, res) => {
  const amount = validateAmount(req.body.amount); // Validation
  db.execute('UPDATE accounts SET balance = balance - ?', [amount]); // Parameterized
});
```

### Limitations
- ❌ Cannot find vulnerabilities in third-party libraries
- ❌ Cannot detect runtime configuration issues
- ❌ May produce false positives
- ❌ Cannot find vulnerabilities from environment variables

### StreamPay Context
For payment stream applications, SAST is critical for:
- Validating stream creation logic
- Ensuring proper wallet authentication
- Preventing amount manipulation
- Securing API endpoints handling financial data

---

## 2. Dependency Scanning (SCA - Software Composition Analysis)

### What It Does
Scans your **dependencies** (npm packages) against known vulnerability databases (NVD, GitHub Advisories).

### What It Finds
- **Known CVEs**: Published vulnerabilities in packages you use
- **Supply Chain Attacks**: Compromised packages
- **Outdated Dependencies**: Packages with security patches available
- **Transitive Vulnerabilities**: Vulnerabilities in dependencies of dependencies

### Example Scenario
```json
// package.json
{
  "dependencies": {
    "express": "4.17.1"  // Has known prototype pollution vulnerability
  }
}
```

```bash
$ npm audit
=== npm audit security report ===                        
                                                                        
# Run  npm install express@4.18.2  to resolve 1 vulnerability
SEMVER WARNING: Recommended action is a potentially breaking change

  High            Prototype Pollution in express                        
                                                                        
  Package         express                                               
                                                                        
  Dependency of   express                                               
                                                                        
  Path            express > qs                                          
                                                                        
  More info       https://github.com/advisories/GHSA-hrpp-9w9c-8f4g
```

### Why It Matters for Fintech
Payment applications often depend on:
- Cryptographic libraries (must be secure)
- HTTP clients (must prevent MITM)
- Serialization libraries (must prevent injection)
- Blockchain SDKs (critical for wallet operations)

A single vulnerable dependency can compromise the entire application.

### StreamPay Dependencies
```typescript
// Current dependencies that are scanned:
- next (framework) - web security
- react (UI) - XSS prevention
- @stellar/stellar-sdk (blockchain) - CRITICAL for wallet operations
```

### Limitations
- ❌ Cannot find vulnerabilities in your own code
- ❌ Only detects known vulnerabilities (zero-days missed)
- ❌ May not detect misconfigurations
- ❌ Cannot assess if vulnerable code is actually executed

---

## 3. Container Scanning

### What It Does
Analyzes **Docker images** for vulnerabilities in:
- Base OS (Alpine, Ubuntu, etc.)
- System libraries (OpenSSL, libc, etc.)
- Installed packages
- Image configuration (user privileges, exposed ports)

### What It Finds
- **OS-level CVEs**: Vulnerabilities in Linux packages
- **Base Image Issues**: Deprecated or EOL base images
- **Misconfigurations**: Running as root, unnecessary packages
- **Library Vulnerabilities**: C/C++ libraries used by Node.js

### Example Trivy Output
```
Dockerfile: FROM node:18-alpine

$ trivy image streampay-frontend:latest

+----------------+------------------+----------+-------------------+---------------+
|    LIBRARY     | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |
+----------------+------------------+----------+-------------------+---------------+
| openssl        | CVE-2023-5678    | CRITICAL | 3.1.2-r0          | 3.1.4-r0      |
+----------------+------------------+----------+-------------------+---------------+
| busybox        | CVE-2023-42364   | HIGH     | 1.36.1-r0         | 1.36.1-r2     |
+----------------+------------------+----------+-------------------+---------------+
```

### Why Container Scanning is Different
Even if your code and dependencies are secure, vulnerabilities can exist in:
- The Node.js binary itself
- OpenSSL (used by Node.js for TLS)
- Alpine/Ubuntu base packages
- System libraries (zlib, libuv, etc.)

### Runtime vs Static
```
SAST: Checks your TypeScript/JavaScript code
       ↓
Dependencies: Checks npm packages
       ↓
Container: Checks the entire runtime environment
           (OS, system libraries, Node.js binary)
```

### StreamPay Context
If containerized for deployment:
- Payment processing runs in this environment
- Wallet keys may be loaded into memory
- Network communication uses TLS (OpenSSL)
- All layers must be secure for fintech compliance

---

## Why All Three Are Necessary

### Attack Scenario: Defense in Depth

**Scenario**: Attacker tries to exploit a StreamPay payment stream endpoint

1. **SAST Protection**: Catches injection vulnerabilities in your code
   - Prevents direct code-level exploits

2. **Dependency Protection**: Ensures express/stellar-sdk have no known CVEs
   - Prevents library-level exploits

3. **Container Protection**: Ensures OpenSSL has no TLS vulnerabilities
   - Prevents network-level exploits

**If any layer is missing, the attacker has a potential attack vector.**

### Real-World Example

```
2023: Vulnerability in npm package "event-stream"
- SAST: Would NOT catch this (not in your code)
- Dependency Scan: WOULD catch this (known CVE)
- Container: Would NOT catch this (npm package, not OS)

2023: OpenSSL Heartbleed-type vulnerability
- SAST: Would NOT catch this (in C library, not JS)
- Dependency Scan: Would NOT catch this (not npm package)
- Container: WOULD catch this (OS-level library)

2023: SQL injection in your API endpoint
- SAST: WOULD catch this (in your code)
- Dependency Scan: Would NOT catch this (not a library issue)
- Container: Would NOT catch this (not OS-level)
```

---

## StreamPay Security Workflow Implementation

### Workflow Triggers
```yaml
on:
  push:
    branches: [main]           # Scan before merge
  pull_request:
    branches: [main]           # Scan every PR
  schedule:
    - cron: '0 2 * * *'        # Nightly scan
```

### Blocking Policy
- **CRITICAL vulnerabilities**: BLOCK merge unless exempted
- **HIGH vulnerabilities**: Report but don't block (informational)
- **Exemptions**: Must have justification, expiry date, and review plan

### Exemption Example
```json
{
  "id": "EXEMPT-001",
  "cve_id": "CVE-2024-12345",
  "package": "some-package",
  "severity": "critical",
  "reason": "Vulnerable code path not reachable in our usage. Package is devDependency only used in test files.",
  "expiry_date": "2026-07-30",
  "mitigation": "Monitor upstream, plan migration to alternative by expiry date"
}
```

---

## Local Testing Commands

### Mirror CI Checks Locally

```bash
# 1. Run dependency audit (same as CI)
npm audit
npm audit --json  # For detailed output

# 2. Run linting (catches some security anti-patterns)
npm run lint

# 3. Run tests (ensures fixes don't break functionality)
npm test

# 4. Validate security configuration
node scripts/validate-security.mjs

# 5. Build (ensures no compilation errors)
npm run build
```

### Fixing Vulnerabilities

```bash
# Automatic fix (review changes carefully!)
npm audit fix

# Fix even if it requires semver-major changes
npm audit fix --force

# Update specific package
npm update vulnerable-package

# After fixing, verify
npm audit
```

---

## Security Notes for StreamPay

### Auth & Keys
- ✅ Wallet private keys must NEVER be logged or stored in code
- ✅ Use environment variables for sensitive configuration
- ✅ Implement proper session management for wallet connections
- ⚠️ Out of scope: Hardware wallet integration, multi-sig

### PII (Personally Identifiable Information)
- ✅ Wallet addresses are pseudonymous, treat as sensitive
- ✅ Transaction amounts and recipients are financial data
- ✅ Implement proper access controls on stream data
- ⚠️ Out of scope: KYC data handling (not in this frontend)

### Chain Settlement
- ✅ All stream calculations must be deterministic
- ✅ Validate amounts before creating transactions
- ✅ Implement proper error handling for failed settlements
- ⚠️ Out of scope: Smart contract auditing (separate process)

### Money Movement
- ✅ Critical: All payment logic must pass security scans
- ✅ Implement idempotency for stream operations
- ✅ Validate all user inputs affecting financial calculations
- ✅ No silent failures on settlement operations
- ⚠️ Out of scope: Backend settlement logic (API responsibility)

---

## Compliance and Best Practices

### Fintech Expectations
1. **Zero critical vulnerabilities** in production
2. **Documented exemptions** with expiry dates
3. **Regular scanning** (CI + nightly)
4. **Defense in depth** (multiple scanning layers)
5. **Incident response** plan for new CVEs

### OWASP Top 10 Coverage
- ✅ A01: Broken Access Control (SAST)
- ✅ A02: Cryptographic Failures (SAST + Dependency)
- ✅ A03: Injection (SAST)
- ✅ A04: Insecure Design (SAST + Review)
- ✅ A05: Security Misconfiguration (Container + Review)
- ✅ A06: Vulnerable Components (Dependency)
- ✅ A07: Authentication Failures (SAST)
- ✅ A08: Data Integrity (All layers)
- ✅ A09: Logging Failures (Review)
- ✅ A10: SSRF (SAST)

---

## Further Reading

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [npm Audit Documentation](https://docs.npmjs.com/cli/commands/npm-audit)
- [Trivy Scanner](https://github.com/aquasecurity/trivy)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [NVD - National Vulnerability Database](https://nvd.nist.gov/)

---

**Last Updated**: 2026-04-28  
**Maintained By**: Security Team  
**Review Cycle**: Quarterly or after major incidents

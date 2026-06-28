# Security Policy

## Reporting a vulnerability

If you believe you have found a security vulnerability in StreamPay,
please **do not** open a public GitHub issue. Instead, contact the
maintainers privately so we can investigate and ship a fix before
disclosure.

When reporting, include as much of the following as you can:

- A clear description of the issue and its impact.
- Reproduction steps or proof-of-concept code.
- Affected versions / commit SHA.
- Any suggested mitigation.

We aim to acknowledge reports within two business days and to issue a
fix or mitigation plan within ten business days for high-severity
issues.

## Scope

In-scope:

- Source under this repository (frontend, API routes, contract).
- Build/release tooling under `scripts/` and `.github/workflows/`.

Out of scope:

- Issues only reachable with attacker-controlled developer machines.
- Denial-of-service against public testnet infrastructure.
- Vulnerabilities in third-party services we link to but do not operate.

## Disclosure

Once a fix has been merged and a release published, we will credit the
reporter in the release notes unless they prefer to remain anonymous.

See also `docs/SECURITY-SCANNING-GUIDE.md` for the internal security
scanning workflow.

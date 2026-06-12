# Contributing to StreamPay Frontend

Thank you for your interest in contributing. This document captures the
conventions the team relies on when reviewing pull requests.

## Workflow

1. Fork the repository and create a feature branch off `main`.
2. Make focused, atomic commits using
   [Conventional Commits](https://www.conventionalcommits.org/) prefixes
   (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `style:`).
3. Run `npm run lint` and `npm test` before opening a PR.
4. Open a pull request against `main` describing the change and any
   trade-offs.

## Code style

- TypeScript is preferred over plain JavaScript for any new module.
- Public functions and exported types should carry TSDoc/JSDoc comments.
- Avoid `any` in new code unless an external type genuinely demands it.
- Keep components small and prefer composition over deep prop drilling.

## Tests

- Unit tests live next to the module they cover (`foo.ts` + `foo.test.ts`).
- New behavior should ship with at least one happy-path test and one
  failure-path test.
- Avoid coupling tests to private implementation details — prefer
  observable behavior at the module boundary.

## Reporting issues

When filing a bug, please include:

- Steps to reproduce.
- Expected vs. actual behavior.
- A minimal repro, where practical.
- Browser/OS and Node version if it is environment-specific.

## Code review

Reviewers look for clarity, correctness, and adherence to the project
conventions above. A passing CI run is required before merge.

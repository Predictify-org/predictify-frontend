# Contributing to Predictify

Thank you for your interest in contributing to Predictify! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Create a branch** for your feature: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our coding standards
4. **Test your changes** thoroughly
5. **Submit a pull request** with a clear description

## Development Setup

See the [README.md](./README.md) for detailed setup instructions.

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (already configured)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### React Components

- Use functional components with hooks
- Prefer named exports over default exports
- Keep components small and focused (single responsibility)
- Use TypeScript interfaces for props

### File Organization

- Group related files in the same directory
- Use index files for clean imports
- Follow the existing project structure

### Example Component Structure

```typescript
// components/feature/FeatureComponent.tsx
import { useState } from 'react';

interface FeatureComponentProps {
  title: string;
  onAction: () => void;
}

export function FeatureComponent({ title, onAction }: FeatureComponentProps) {
  const [state, setState] = useState<string>('');
  
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(wallet): add support for XBull wallet

fix(events): resolve pagination issue on events page

docs(readme): update setup instructions
```

## Testing

- Write tests for new features
- Ensure all tests pass: `pnpm test`
- Aim for good test coverage
- Test both success and error cases

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all checks pass**:
   - `pnpm validate` (type-check, lint, test)
   - Build succeeds: `pnpm build`
4. **Write a clear PR description**:
   - What changes were made
   - Why they were made
   - How to test
   - Screenshots if UI changes

## Code Review

- Be respectful and constructive
- Address all review comments
- Keep PRs focused and reasonably sized
- Respond to feedback promptly

## Questions?

Open an issue or contact the maintainers. We're here to help!

Thank you for contributing to Predictify! 🚀


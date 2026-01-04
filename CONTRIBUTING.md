# Contributing to react-native-infinite-tab-view

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/johntips/react-native-infinite-tab-view.git
cd react-native-infinite-tab-view
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the library:

```bash
pnpm build
```

4. Run the example app:

```bash
cd example
pnpm install
pnpm start
```

## Project Structure

```
react-native-infinite-tab-view/
├── src/              # Source code
│   ├── index.ts      # Main entry point
│   ├── Container.tsx # Main container component
│   ├── Tab.tsx       # Tab component
│   ├── TabBar.tsx    # Tab bar component
│   ├── FlatList.tsx  # FlatList wrapper
│   ├── ScrollView.tsx# ScrollView wrapper
│   ├── Context.tsx   # React context
│   ├── types.ts      # TypeScript types
│   ├── constants.ts  # Constants
│   └── utils.ts      # Utility functions
├── lib/              # Compiled output (git ignored)
├── example/          # Example Expo app
└── assets/           # Demo GIFs and images
```

## Development Workflow

### Making Changes

1. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes in the `src/` directory

3. Build and test:

```bash
pnpm build
pnpm test
```

4. Test in the example app:

```bash
cd example && pnpm start
```

### Code Style

- Use TypeScript for all source files
- Follow existing code patterns
- Run linting before committing:

```bash
pnpm lint
pnpm lint:fix  # Auto-fix issues
```

### Testing

Run tests with:

```bash
pnpm test
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
```

## Pull Request Guidelines

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md for significant changes
5. Keep PRs focused on a single feature or fix

## Commit Message Format

Use conventional commits:

```
feat: add new feature
fix: fix a bug
docs: update documentation
test: add tests
refactor: refactor code
chore: maintenance tasks
```

## Reporting Issues

When reporting issues, please include:

- React Native version
- Expo SDK version (if applicable)
- Device/simulator info
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

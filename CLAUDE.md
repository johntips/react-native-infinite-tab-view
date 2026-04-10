# react-native-infinite-tab-view — Contribution Guidelines

## 🚨 Code & Documentation Policy

This is an open-source library. **No product-specific information is allowed in the codebase.**

### Forbidden
- Specific product names, brand names, or internal codenames
- References to consumer apps that use this library
- Internal business logic, domain terminology, or feature names tied to specific products
- Team names, company names, or personal identifiers in comments or commits

### Required
- **Generic, universal language** for all comments, documentation, and examples
- Describe phenomena and technical concerns (e.g., "heavy list rendering", "large dataset", "complex hook composition") rather than product-specific scenarios
- Examples should use fictional/neutral data (news articles, blog posts, generic feeds)

### Enforcement
- Applies to: source code, tests, examples, CHANGELOG, README, commit messages, PR descriptions
- Applies regardless of whether the product uses this library internally

---

## Architecture Principles

### Core: JS Thread Minimization
The library's defining principle is **zero JS thread work during swipe gestures**.

- `activeIndex` must be a `SharedValue`, never React state
- State propagation through Reanimated `useAnimatedReaction` and `useDerivedValue`
- React re-renders must not block gesture recognition

### Async Follow Design
Swipe and tab bar animations are decoupled:
- PagerView swipe runs on native thread (60fps guaranteed)
- Tab indicator follows via `withTiming` after swipe completes
- Neither waits for the other

### Breaking Changes
Document in CHANGELOG with migration examples. Bump major version.

---

## Performance Requirements

Any change must not regress:
- 60fps swipe under heavy list content
- Zero React re-renders triggered by `activeIndex` changes
- Independent operation of FlashList scrolling and tab bar swiping

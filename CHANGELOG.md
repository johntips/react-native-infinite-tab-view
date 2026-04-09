# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-09

### Fixed

- **Android ViewPager2 recycling crash**: Prevent `IllegalArgumentException: Scrapped or attached views may not be recycled` during rapid swiping with infinite scroll enabled. The clone-to-real jump now uses `InteractionManager.runAfterInteractions` on Android to wait for RecyclerView recycling to complete, with a try-catch guard as a safety net.
- **State desync during rapid swiping**: Prevent `activeIndex` from desyncing with the visible page when swiping rapidly through clone boundaries. Pending jumps are now cancelled when the user starts a new drag gesture, and jumps are skipped if the pager is no longer idle.

## [1.0.0] - 2026-01-04

### Added

- Initial release
- Infinite horizontal scroll for tabs and content
- Active tab center alignment (auto-scrolls to center)
- Collapsible header support
- New Architecture (Fabric) ready
- Expo 54+ compatibility
- Drop-in replacement API for react-native-collapsible-tab-view
- `Tabs.Container` component with configurable props
- `Tabs.Tab` component for defining tabs
- `Tabs.FlatList` wrapper for virtualized lists
- `Tabs.ScrollView` wrapper for scroll content
- Custom tab bar support via `renderTabBar` prop
- TypeScript support with full type definitions
- iOS and Android support

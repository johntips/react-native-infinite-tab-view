# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-04-07

### Added

- `onFocusedTabPress` コールバックを追加: 既にアクティブなタブが再タップされたときに呼び出される（scrollToTop 等の用途）

## [2.2.1] - 2026-04-07

### Fixed

- Android でタブバーのセンタリングアニメーションが効かない問題を修正（scrollTo 重複発火の防止）
- テスト環境が monorepo に依存していた問題を修正（devDependencies 追加、mock 整備）
- example アプリが Expo Go SDK 55 で起動しない問題を修正（NativeWorklets バージョン不一致）
- example の metro.config.js が monorepo の node_modules を参照し FormData クラッシュする問題を修正
- TabBar.test.tsx の変数名バグを修正

## [2.2.0] - 2026-04-06

### Added

- MaterialTabBar に centerActive サポートを追加

## [2.1.0] - 2026-04-06

### Changed

- Android タブスワイプの滑らかさを改善（Easing アニメーション追加）

## [2.0.0] - 2026-04-06

### Changed

- Expo SDK 55 / React Native 0.83 / React 19 対応
- タブセンタリングバグ修正

### Breaking Changes

- `react` >= 19.2.0、`react-native` >= 0.83.0 が必須に

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

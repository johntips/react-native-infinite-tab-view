import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

// React Native グローバル変数を定義
// @ts-expect-error -- vitest 環境で __DEV__ を定義
globalThis.__DEV__ = true;

// jsdom に window.matchMedia がないため polyfill
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// react-native-reanimated をモック（Babel plugin なしの web/test 環境用）
vi.mock("react-native-reanimated", () => {
  const { View, ScrollView } = require("react-native-web");
  return {
    __esModule: true,
    default: {
      View,
      ScrollView,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedReaction: () => {},
    useAnimatedRef: () => ({ current: null }),
    useEvent: () => () => {},
    scrollTo: () => {},
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    runOnUI: (fn: (...args: unknown[]) => void) => fn,
    withTiming: (value: number) => value,
    withSpring: (value: number) => value,
    Easing: {
      linear: vi.fn(),
      ease: vi.fn(),
      out: () => vi.fn(),
      in: () => vi.fn(),
      cubic: vi.fn(),
    },
  };
});

// react-native-pager-view をモック（ネイティブコンポーネントは vitest で利用不可）
vi.mock("react-native-pager-view", () => {
  const { forwardRef } = require("react");
  return {
    __esModule: true,
    default: forwardRef((props: any, ref: any) =>
      React.createElement("div", {
        ...props,
        ref,
        "data-testid": "pager-view",
      }),
    ),
  };
});

afterEach(() => {
  cleanup();
});

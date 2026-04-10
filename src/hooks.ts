import { useEffect, useState } from "react";
import {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
} from "react-native-reanimated";
import { useTabsContext } from "./Context";

/**
 * 現在のタブのスクロールY位置を返すフック
 * react-native-collapsible-tab-view との互換性のため提供
 * @returns Reanimated SharedValue<number>
 */
export const useCurrentTabScrollY = () => {
  const context = useTabsContext();
  return context.scrollY;
};

/**
 * 現在アクティブなタブのインデックスを SharedValue で返すフック
 * v4.0.0 で `number` から `SharedValue<number>` に変更（BREAKING）
 * Reanimated worklet / useAnimatedReaction 内で使用することで re-render を一切発生させない。
 *
 * @example
 * ```tsx
 * const activeIndex = useActiveTabIndex();
 * useAnimatedReaction(
 *   () => activeIndex.value,
 *   (current) => { ... },
 * );
 * ```
 */
export const useActiveTabIndex = (): SharedValue<number> => {
  const context = useTabsContext();
  return context.activeIndex;
};

/**
 * 現在アクティブなタブのインデックスを JS 値として返すフック（React state 経由）
 * v4.0.0 新規追加。React コンポーネント内で JS 値が必要な場合に使用。
 * 注意: 値が変わるたびに re-render が発生する（SharedValue 版は re-render しない）
 */
export const useActiveTabIndexValue = (): number => {
  const activeIndex = useActiveTabIndex();
  const [value, setValue] = useState(activeIndex.value);
  useAnimatedReaction(
    () => activeIndex.value,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setValue)(current);
      }
    },
  );
  return value;
};

/**
 * タブ情報を返すフック
 */
export const useTabs = () => {
  const context = useTabsContext();
  return context.tabs;
};

/**
 * 指定タブ名がアクティブかどうかを返すフック (v4.4.0 新規)
 *
 * v4.4.0 より: Container 側の **centralized subscription** を使い、
 * 各インスタンスは `useAnimatedReaction` を持たない。
 * - 20 タブがあっても worklet 評価は Container の 1 個だけ
 * - 1 swipe で runOnJS は最大 2 回 (前アクティブ + 新アクティブ) のみ
 * - React commit の batch サイズが激減し、dispatch latency が大幅改善
 *
 * @example
 * ```tsx
 * const isActive = useIsTabActive("sports");
 * ```
 */
export const useIsTabActive = (tabName: string): boolean => {
  const context = useTabsContext();
  const tabIndex = context.tabNames.indexOf(tabName);
  const [isActive, setIsActive] = useState(() =>
    tabIndex === -1 ? false : context.subscriptions.getInitialActive(tabIndex),
  );

  useEffect(() => {
    if (tabIndex === -1) return;
    // subscribe 後に最新値で同期 (マウント時に activeIndex が変わっていた場合の保険)
    setIsActive(context.subscriptions.getInitialActive(tabIndex));
    const unsubscribe = context.subscriptions.subscribeToActive(
      tabIndex,
      setIsActive,
    );
    return unsubscribe;
  }, [tabIndex, context.subscriptions]);

  return isActive;
};

/**
 * 指定タブが「nearby」（アクティブまたは隣接）かどうかを返すフック
 *
 * v4.4.0 改善: Container 側の centralized subscription を使用するように変更。
 * 内部実装が変わっただけで API は互換。
 *
 * @example
 * ```tsx
 * const isNearby = useIsNearby("pokemon");
 * ```
 */
export const useIsNearby = (tabName: string): boolean => {
  const context = useTabsContext();
  const tabIndex = context.tabNames.indexOf(tabName);
  const [isNearby, setIsNearby] = useState(() =>
    tabIndex === -1 ? false : context.subscriptions.getInitialNearby(tabIndex),
  );

  useEffect(() => {
    if (tabIndex === -1) return;
    setIsNearby(context.subscriptions.getInitialNearby(tabIndex));
    const unsubscribe = context.subscriptions.subscribeToNearby(
      tabIndex,
      setIsNearby,
    );
    return unsubscribe;
  }, [tabIndex, context.subscriptions]);

  return isNearby;
};

/**
 * 現在の nearbyIndexes（アクティブ + 隣接タブのインデックス配列）を SharedValue で返すフック
 * v4.0.0 で `number[]` から `SharedValue<number[]>` に変更（BREAKING）
 */
export const useNearbyIndexes = (): SharedValue<number[]> => {
  const context = useTabsContext();
  return context.nearbyIndexes;
};

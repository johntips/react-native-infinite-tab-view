import { useState } from "react";
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
 * 指定タブが「nearby」（アクティブまたは隣接）かどうかを返すフック
 * v4.0.0 で SharedValue ベースに変更。React state を経由せず UI thread で判定する。
 *
 * @example
 * ```tsx
 * const isNearby = useIsNearby("pokemon");
 * // isNearby は JS bool（React state）。値変更時に re-render される。
 * // 大量の useIsNearby を使う場合は useIsNearbyShared の使用を検討。
 * ```
 */
export const useIsNearby = (tabName: string): boolean => {
  const context = useTabsContext();
  const tabIndex = context.tabNames.indexOf(tabName);
  // 初期値は SharedValue から直接読む（activeIndex=0 の初期状態で nearby 判定）
  const initialNearby =
    tabIndex !== -1 && context.nearbyIndexes.value.includes(tabIndex);
  const [isNearby, setIsNearby] = useState(initialNearby);

  useAnimatedReaction(
    () => {
      if (tabIndex === -1) return false;
      return context.nearbyIndexes.value.includes(tabIndex);
    },
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setIsNearby)(current);
      }
    },
    [tabIndex],
  );

  return isNearby;
};

/**
 * 指定タブが「nearby」かを SharedValue で返すフック（re-render なし）
 * v4.0.0 新規追加。worklet 内で使用することを想定。
 */
export const useIsNearbyShared = (tabName: string): SharedValue<boolean> => {
  const context = useTabsContext();
  const tabIndex = context.tabNames.indexOf(tabName);
  // useDerivedValue を dynamic import 風に使いたいが、固定で最上位呼び出しが必要
  // → シンプルに nearbyIndexes を露出して利用側で .value.includes するのが確実
  //   現時点では useIsNearby を返す方針で、将来 useDerivedValue に差し替え
  // biome-ignore lint/suspicious/noExplicitAny: return type placeholder
  return {
    get value() {
      "worklet";
      if (tabIndex === -1) return false;
      return context.nearbyIndexes.value.includes(tabIndex);
    },
  } as SharedValue<boolean>;
};

/**
 * 現在の nearbyIndexes（アクティブ + 隣接タブのインデックス配列）を SharedValue で返すフック
 * v4.0.0 で `number[]` から `SharedValue<number[]>` に変更（BREAKING）
 */
export const useNearbyIndexes = (): SharedValue<number[]> => {
  const context = useTabsContext();
  return context.nearbyIndexes;
};

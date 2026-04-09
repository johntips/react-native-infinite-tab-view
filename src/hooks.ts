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
 * 現在アクティブなタブのインデックスを返すフック
 */
export const useActiveTabIndex = () => {
  const context = useTabsContext();
  return context.activeIndex;
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
 * nearbyなタブはデータの事前フェッチ対象。
 *
 * @example
 * ```tsx
 * const isNearby = useIsNearby("pokemon");
 * const { data } = useQuery({ enabled: isFocused || isNearby });
 * ```
 */
export const useIsNearby = (tabName: string): boolean => {
  const context = useTabsContext();
  const tabIndex = context.tabNames.indexOf(tabName);
  if (tabIndex === -1) return false;
  return context.nearbyIndexes.includes(tabIndex);
};

/**
 * 現在の nearbyIndexes（アクティブ + 隣接タブのインデックス配列）を返すフック
 */
export const useNearbyIndexes = (): number[] => {
  const context = useTabsContext();
  return context.nearbyIndexes;
};

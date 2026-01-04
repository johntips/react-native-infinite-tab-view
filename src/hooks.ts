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

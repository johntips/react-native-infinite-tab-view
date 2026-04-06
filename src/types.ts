import type { ComponentProps, ReactElement, ReactNode, RefObject } from "react";
import type {
  FlatListProps,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import type PagerView from "react-native-pager-view";

export interface TabChangeEvent {
  tabName: string;
  index: number;
  prevTabName: string;
  prevIndex: number;
}

export interface TabsContainerProps {
  children: ReactNode;
  renderHeader?: () => ReactElement;
  renderTabBar?: (props: TabBarProps) => ReactElement;
  headerHeight?: number;
  infiniteScroll?: boolean; // 無限スクロール（デフォルトtrue）
  tabBarCenterActive?: boolean; // アクティブタブ中央配置（デフォルトtrue）
  onTabChange?: (event: TabChangeEvent) => void;
  /** 既にアクティブなタブが再タップされたときに呼ばれる */
  onFocusedTabPress?: (index: number) => void;
  // スタイリングオプション（collapsible-tab-view互換）
  containerStyle?: StyleProp<ViewStyle>;
  headerContainerStyle?: StyleProp<ViewStyle>;
  tabBarContainerStyle?: StyleProp<ViewStyle>;
  allowHeaderOverscroll?: boolean;
  /** PagerView に直接渡す props */
  pagerProps?: Partial<ComponentProps<typeof PagerView>>;
  /** 初期表示タブ名 */
  initialTabName?: string;
}

export interface TabProps {
  name: string;
  label: string;
  children: ReactNode;
}

export interface TabBarProps {
  tabs: Array<{ name: string; label: string }>;
  activeIndex: number;
  onTabPress: (index: number) => void;
  infiniteScroll: boolean;
  centerActive: boolean;
  /** Container から渡される ScrollView ref */
  tabScrollRef?: RefObject<ScrollView>;
}

export interface TabsContextValue {
  activeIndex: number;
  tabs: Array<{ name: string; label: string }>;
  scrollY: any; // Reanimated SharedValue<number>
  headerHeight: number;
  infiniteScroll: boolean;
  tabBarCenterActive: boolean;
  updateScrollY: (y: number) => void;
  /** タブ名の配列 */
  tabNames: string[];
}

export interface TabsFlatListProps<T> extends FlatListProps<T> {
  // すべてのFlatListプロップを継承
}

export interface TabsScrollViewProps extends ScrollViewProps {
  // すべてのScrollViewプロップを継承
}

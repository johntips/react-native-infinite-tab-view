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

export interface DebugLogEvent {
  type:
    | "tab-active"
    | "tab-nearby"
    | "tab-unmounted"
    | "prefetch-start"
    | "prefetch-cached";
  tabName: string;
  tabIndex: number;
  timestamp: number;
  detail?: string;
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
  /**
   * PagerView の offscreenPageLimit（デフォルト: 1）
   * 1 = 3ページ（prev/current/next）、2 = 5ページ、etc.
   */
  offscreenPageLimit?: number;
  /**
   * Lazy mount: nearby でないタブのコンテンツをマウントしない（デフォルト: false）
   * true にすると、アクティブ + offscreenPageLimit 範囲内のタブのみ children をレンダリング。
   * 一度 nearby になったタブはアンマウントせず維持する（React state 保持のため）。
   */
  lazy?: boolean;
  /** デバッグモード: コンソール + onDebugLog にログ出力 */
  debug?: boolean;
  /** デバッグログコールバック: アプリ側でログを受け取る */
  onDebugLog?: (event: DebugLogEvent) => void;
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
  /** アクティブタブ + 隣接タブのインデックス配列（offscreenPageLimit に基づく） */
  nearbyIndexes: number[];
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

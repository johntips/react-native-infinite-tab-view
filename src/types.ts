import type { ComponentProps, ReactElement, ReactNode, RefObject } from "react";
import type {
  FlatListProps,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import type PagerView from "react-native-pager-view";
import type { SharedValue } from "react-native-reanimated";

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
  /**
   * アクティブタブのインデックス（SharedValue）
   * v4.0.0 で `number` から `SharedValue<number>` に変更。
   * re-render を経由せず UI thread で直接更新される。
   */
  activeIndex: SharedValue<number>;
  onTabPress: (index: number) => void;
  infiniteScroll: boolean;
  centerActive: boolean;
  /** Container から渡される ScrollView ref */
  tabScrollRef?: RefObject<ScrollView>;
}

/**
 * タブ状態 subscription のコールバック型。
 * true / false を setState 的に受け取る。
 *
 * @param value       新しい active/nearby 状態
 * @param workletTime (オプション) worklet 側で記録した performance.now() 値。
 *                    worklet → JS bridge 越えの hop latency を計測したい perf
 *                    ツール向け。通常の consumer は無視してよい。
 */
export type TabBoolSubscriber = (value: boolean, workletTime?: number) => void;

/**
 * v4.4.0 追加: centralized subscription registry。
 * Container 内部に 1 個だけ useAnimatedReaction を持ち、
 * activeIndex / nearbyIndexes の変化を subscribers に通知する。
 *
 * これにより N 個のタブが個別に useAnimatedReaction を持つのを避け、
 * React commit 負荷を激減させる (20 reactions → 1 reaction)。
 */
export interface TabSubscriptionAPI {
  /** 指定 tabIndex が active になった/外れた時に呼ばれる callback を登録 */
  subscribeToActive: (tabIndex: number, cb: TabBoolSubscriber) => () => void;
  /** 指定 tabIndex が nearby に入った/外れた時に呼ばれる callback を登録 */
  subscribeToNearby: (tabIndex: number, cb: TabBoolSubscriber) => () => void;
  /** 初期値取得 (subscribe 直後にも呼ぶ) */
  getInitialActive: (tabIndex: number) => boolean;
  getInitialNearby: (tabIndex: number) => boolean;
}

export interface TabsContextValue {
  /**
   * アクティブタブのインデックス（SharedValue）
   * v4.0.0 で `number` から `SharedValue<number>` に変更。
   * Consumer の re-render を引き起こさず、UI thread で値が伝播する。
   */
  activeIndex: SharedValue<number>;
  /** アクティブタブ + 隣接タブのインデックス配列（SharedValue） */
  nearbyIndexes: SharedValue<number[]>;
  tabs: Array<{ name: string; label: string }>;
  // biome-ignore lint/suspicious/noExplicitAny: Animated.Value の型が Reanimated と混在しないため
  scrollY: any;
  headerHeight: number;
  infiniteScroll: boolean;
  tabBarCenterActive: boolean;
  updateScrollY: (y: number) => void;
  /** タブ名の配列 */
  tabNames: string[];
  /** v4.4.0 追加: centralized subscription API (useIsTabActive / useIsNearby から利用) */
  subscriptions: TabSubscriptionAPI;
}

export interface TabsFlatListProps<T> extends FlatListProps<T> {
  // すべてのFlatListプロップを継承
}

export interface TabsScrollViewProps extends ScrollViewProps {
  // すべてのScrollViewプロップを継承
}

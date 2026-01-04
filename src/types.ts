import type { ReactElement, ReactNode } from "react";
import type { FlatListProps, ScrollViewProps, StyleProp, ViewStyle } from "react-native";

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
  // スタイリングオプション（collapsible-tab-view互換）
  containerStyle?: StyleProp<ViewStyle>;
  headerContainerStyle?: StyleProp<ViewStyle>;
  tabBarContainerStyle?: StyleProp<ViewStyle>;
  allowHeaderOverscroll?: boolean;
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
  onScroll?: (event: any) => void;
}

export interface TabsContextValue {
  activeIndex: number;
  tabs: Array<{ name: string; label: string }>;
  scrollY: any; // Reanimated SharedValue<number>
  headerHeight: number;
  infiniteScroll: boolean;
  tabBarCenterActive: boolean;
  updateScrollY: (y: number) => void;
}

export interface TabsFlatListProps<T> extends FlatListProps<T> {
  // すべてのFlatListプロップを継承
}

export interface TabsScrollViewProps extends ScrollViewProps {
  // すべてのScrollViewプロップを継承
}

import type { ReactElement, ReactNode } from "react";
import type { FlatListProps, ScrollViewProps } from "react-native";

export interface TabsContainerProps {
  children: ReactNode;
  renderHeader?: () => ReactElement;
  renderTabBar?: (props: TabBarProps) => ReactElement;
  headerHeight?: number;
  infiniteScroll?: boolean; // 🆕 無限スクロール（デフォルトtrue）
  tabBarCenterActive?: boolean; // 🆕 アクティブタブ中央配置（デフォルトtrue）
  onTabChange?: (tabName: string) => void;
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
  scrollY: any; // Animated.Value
  headerHeight: number;
  infiniteScroll: boolean;
  tabBarCenterActive: boolean;
}

export interface TabsFlatListProps<T> extends FlatListProps<T> {
  // すべてのFlatListプロップを継承
}

export interface TabsScrollViewProps extends ScrollViewProps {
  // すべてのScrollViewプロップを継承
}

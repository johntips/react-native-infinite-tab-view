import { Container } from "./Container";
import { FlashList } from "./FlashList";
import { FlatList } from "./FlatList";
import { ScrollView } from "./ScrollView";
import { Tab } from "./Tab";

export const Tabs = {
  Container,
  Tab,
  FlatList,
  FlashList,
  ScrollView,
};

export { useTabsContext } from "./Context";
// Hooks
export { useActiveTabIndex, useCurrentTabScrollY, useTabs } from "./hooks";

// Components
export { MaterialTabBar } from "./MaterialTabBar";
export { DefaultTabBar, type DefaultTabBarProps } from "./TabBar";

// Types
export * from "./types";

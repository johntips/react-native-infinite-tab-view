import { Container } from "./Container";
import { FlatList } from "./FlatList";
import { FlashList } from "./FlashList";
import { ScrollView } from "./ScrollView";
import { Tab } from "./Tab";

export const Tabs = {
  Container,
  Tab,
  FlatList,
  FlashList,
  ScrollView,
};

// Hooks
export { useCurrentTabScrollY, useActiveTabIndex, useTabs } from "./hooks";
export { useTabsContext } from "./Context";

// Components
export { MaterialTabBar } from "./MaterialTabBar";
export { DefaultTabBar } from "./TabBar";

// Types
export * from "./types";

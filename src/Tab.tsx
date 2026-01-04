import type React from "react";
import type { TabProps } from "./types";

export const Tab: React.FC<TabProps> = ({ children }) => {
  // Containerがchildrenを抽出してpropsとして扱う
  // このコンポーネント自体はレンダリングされない
  return <>{children}</>;
};

Tab.displayName = "Tabs.Tab";

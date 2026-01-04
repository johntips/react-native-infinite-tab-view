import { createContext, useContext } from "react";
import type { TabsContextValue } from "./types";

const TabsContext = createContext<TabsContextValue | null>(null);

export const TabsProvider = TabsContext.Provider;

export const useTabsContext = (): TabsContextValue => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabsContext must be used within TabsProvider");
  }
  return context;
};

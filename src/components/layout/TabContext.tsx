import { createContext, useContext } from "react";

interface TabContextValue {
  tabId: string;
  isActive: boolean;
}

export const TabContext = createContext<TabContextValue>({ tabId: "", isActive: false });

export function useTabContext() {
  return useContext(TabContext);
}

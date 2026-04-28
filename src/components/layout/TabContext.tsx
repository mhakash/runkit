import { createContext, useContext } from "react";

interface TabContextValue {
  tabId: string;
}

export const TabContext = createContext<TabContextValue>({ tabId: "" });

export function useTabContext() {
  return useContext(TabContext);
}

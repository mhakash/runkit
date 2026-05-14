import { create } from "zustand";
import { saveSettings, type Theme } from "@/lib/settings";

interface SettingsStore {
  theme: Theme;
  hydrated: boolean;
  hydrate: (theme: Theme) => void;
  setTheme: (theme: Theme) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: "dark",
  hydrated: false,

  hydrate: (theme) => {
    set({ theme, hydrated: true });
    document.documentElement.setAttribute("data-theme", theme);
  },

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
    saveSettings({ theme });
  },
}));

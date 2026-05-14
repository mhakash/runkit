import { readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from "@tauri-apps/plugin-fs";

export type Theme = "dark" | "dim" | "light";

export interface AppSettings {
  theme: Theme;
}

const SETTINGS_FILE = "settings.json";
const DEFAULT_SETTINGS: AppSettings = { theme: "dark" };

export async function loadSettings(): Promise<AppSettings> {
  try {
    const fileExists = await exists(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return DEFAULT_SETTINGS;
    const raw = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppData });
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(data: AppSettings): Promise<void> {
  try {
    await mkdir(".", { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(SETTINGS_FILE, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

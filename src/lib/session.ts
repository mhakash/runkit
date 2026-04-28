import { readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { Tab } from "@/types/tab";

export interface PdfTabState {
  filePath: string;
  currentPage: number;
  scale: number;
  scrollMode: "continuous" | "single";
}

export interface RecentPdf {
  filePath: string;
  name: string;
  currentPage: number;
  numPages: number;
  scale: number;
  scrollMode: "continuous" | "single";
  lastOpenedAt: number; // unix ms
}

export interface SessionData {
  tabs: Tab[];
  activeTabId: string;
  pdfStates: Record<string, PdfTabState>;
  recentPdfs: RecentPdf[];
}

const SESSION_FILE = "session.json";

export async function loadSession(): Promise<SessionData | null> {
  try {
    const fileExists = await exists(SESSION_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return null;
    const raw = await readTextFile(SESSION_FILE, { baseDir: BaseDirectory.AppData });
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function saveSession(data: SessionData): Promise<void> {
  try {
    // Ensure the app data directory exists
    await mkdir(".", { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(SESSION_FILE, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

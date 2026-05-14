import { create } from "zustand";
import { readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { Todo, Section, FilterState, TodoData, Priority } from "@/types/todo";

const TODO_FILE = "todos.json";
const COMPLETED_SECTION_ID = "__completed__";

const DEFAULT_SECTIONS: Section[] = [
  { id: "personal", name: "Personal", order: 0 },
  { id: "work", name: "Work", order: 1 },
];

const DEFAULT_FILTERS: FilterState = {
  date: null,
  createdDate: null,
  priority: null,
  sectionId: null,
  status: "all",
  search: "",
};

interface TodoStore {
  sections: Section[];
  todos: Todo[];
  filters: FilterState;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  save: () => Promise<void>;

  // Todos
  addTodo: (title: string, sectionId: string) => void;
  updateTodo: (id: string, patch: Partial<Omit<Todo, "id" | "createdAt">>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  reorderTodos: (todos: Todo[]) => void;

  // Sections
  addSection: (name: string) => void;
  updateSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;
  reorderSections: (sections: Section[]) => void;

  // Filters
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function persistTodos(data: TodoData) {
  try {
    await mkdir(".", { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(TODO_FILE, JSON.stringify(data, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch (e) {
    console.error("Failed to save todos:", e);
  }
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  sections: DEFAULT_SECTIONS,
  todos: [],
  filters: DEFAULT_FILTERS,
  hydrated: false,

  hydrate: async () => {
    try {
      const fileExists = await exists(TODO_FILE, { baseDir: BaseDirectory.AppData });
      if (!fileExists) {
        set({ hydrated: true });
        return;
      }
      const raw = await readTextFile(TODO_FILE, { baseDir: BaseDirectory.AppData });
      const data = JSON.parse(raw) as TodoData;
      set({
        sections: data.sections ?? DEFAULT_SECTIONS,
        todos: data.todos ?? [],
        filters: { ...DEFAULT_FILTERS, ...(data.filters ?? {}) },
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  save: async () => {
    const { sections, todos, filters } = get();
    await persistTodos({ sections, todos, filters });
  },

  addTodo: (title, sectionId) => {
    const { todos } = get();
    const sectionTodos = todos.filter((t) => t.sectionId === sectionId);
    const maxOrder = sectionTodos.length ? Math.max(...sectionTodos.map((t) => t.order)) : -1;
    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      sectionId,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    set((s) => ({ todos: [...s.todos, todo] }));
    scheduleSave(get);
  },

  updateTodo: (id, patch) => {
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    scheduleSave(get);
  },

  deleteTodo: (id) => {
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
    scheduleSave(get);
  },

  toggleTodo: (id) => {
    const { todos } = get();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    if (completed) {
      const completedTodos = todos.filter((t) => t.sectionId === COMPLETED_SECTION_ID);
      const maxOrder = completedTodos.length ? Math.max(...completedTodos.map((t) => t.order)) : -1;
      set((s) => ({
        todos: s.todos.map((t) =>
          t.id === id
            ? { ...t, completed: true, completedAt: Date.now(), sectionId: COMPLETED_SECTION_ID, order: maxOrder + 1 }
            : t
        ),
      }));
    } else {
      // Move back to "Personal" as default when un-completing
      const personalTodos = todos.filter((t) => t.sectionId === "personal");
      const maxOrder = personalTodos.length ? Math.max(...personalTodos.map((t) => t.order)) : -1;
      set((s) => ({
        todos: s.todos.map((t) =>
          t.id === id
            ? { ...t, completed: false, completedAt: undefined, sectionId: "personal", order: maxOrder + 1 }
            : t
        ),
      }));
    }
    scheduleSave(get);
  },

  reorderTodos: (todos) => {
    set({ todos });
    scheduleSave(get);
  },

  addSection: (name) => {
    const { sections } = get();
    const maxOrder = sections.length ? Math.max(...sections.map((s) => s.order)) : -1;
    const section: Section = {
      id: crypto.randomUUID(),
      name,
      order: maxOrder + 1,
    };
    set((s) => ({ sections: [...s.sections, section] }));
    scheduleSave(get);
  },

  updateSection: (id, name) => {
    set((s) => ({
      sections: s.sections.map((sec) => (sec.id === id ? { ...sec, name } : sec)),
    }));
    scheduleSave(get);
  },

  deleteSection: (id) => {
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== id),
      todos: s.todos.filter((t) => t.sectionId !== id),
    }));
    scheduleSave(get);
  },

  reorderSections: (sections) => {
    set({ sections });
    scheduleSave(get);
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }));
    scheduleSave(get);
  },

  clearFilters: () => {
    set({ filters: DEFAULT_FILTERS });
    scheduleSave(get);
  },
}));

function scheduleSave(get: () => TodoStore) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { sections, todos, filters } = get();
    persistTodos({ sections, todos, filters });
  }, 300);
}

export { COMPLETED_SECTION_ID };

export function getPriorityLabel(p: Priority): string {
  return p === "high" ? "High" : p === "medium" ? "Med" : "Low";
}

export function getPriorityColor(p: Priority): string {
  return p === "high"
    ? "text-danger border-danger/40 bg-danger/10"
    : p === "medium"
    ? "text-warning border-warning/40 bg-warning/10"
    : "text-text-muted border-border bg-surface-2";
}

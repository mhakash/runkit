export type Priority = "high" | "medium" | "low";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
  priority?: Priority;
  dueDate?: string; // ISO date string YYYY-MM-DD
  notes?: string;
  sectionId: string;
  order: number;
  createdAt: number;
}

export interface Section {
  id: string;
  name: string;
  order: number;
}

export type FilterDate = "today" | "tomorrow" | "this_week" | "overdue" | "custom" | null;
export type FilterPriority = Priority | null;
export type FilterStatus = "active" | "completed" | "all";

export interface FilterState {
  date: FilterDate;
  customDateFrom?: string;
  customDateTo?: string;
  createdDate: FilterDate;
  createdDateFrom?: string;
  createdDateTo?: string;
  priority: FilterPriority;
  sectionId: string | null;
  status: FilterStatus;
  search: string;
}

export interface TodoData {
  sections: Section[];
  todos: Todo[];
  filters: FilterState;
}

import dayjs from "dayjs";
import type { Todo, FilterState } from "@/types/todo";
import { useTodoStore } from "@/hooks/useTodoStore";

export function todayStr() { return dayjs().format("YYYY-MM-DD"); }
export function tomorrowStr() { return dayjs().add(1, "day").format("YYYY-MM-DD"); }
export function thisWeekEndStr() { return dayjs().endOf("week").format("YYYY-MM-DD"); }
export function formatDate(iso: string) { return dayjs(iso).format("MMM D"); }
export function isOverdue(iso: string) { return iso < todayStr(); }

function matchesDateFilter(
  dateStr: string,
  filter: ReturnType<typeof useTodoStore.getState>["filters"]["date"],
  customFrom?: string,
  customTo?: string
): boolean {
  if (!filter) return true;
  if (filter === "today" && dateStr !== todayStr()) return false;
  if (filter === "tomorrow" && dateStr !== tomorrowStr()) return false;
  if (filter === "this_week" && (dateStr < todayStr() || dateStr > thisWeekEndStr())) return false;
  if (filter === "overdue" && !isOverdue(dateStr)) return false;
  if (filter === "custom") {
    if (customFrom && dateStr < customFrom) return false;
    if (customTo && dateStr > customTo) return false;
  }
  return true;
}

export function matchesFilters(
  todo: Todo,
  filters: ReturnType<typeof useTodoStore.getState>["filters"]
): boolean {
  const { date, customDateFrom, customDateTo, createdDate, createdDateFrom, createdDateTo, priority, sectionId, status, search } = filters;

  if (sectionId && todo.sectionId !== sectionId) return false;
  if (status === "active" && todo.completed) return false;
  if (status === "completed" && !todo.completed) return false;
  if (priority && todo.priority !== priority) return false;
  if (search && !todo.title.toLowerCase().includes(search.toLowerCase())) return false;

  if (date) {
    if (!todo.dueDate) return false;
    if (!matchesDateFilter(todo.dueDate, date, customDateFrom, customDateTo)) return false;
  }

  if (createdDate) {
    const created = dayjs(todo.createdAt).format("YYYY-MM-DD");
    if (!matchesDateFilter(created, createdDate, createdDateFrom, createdDateTo)) return false;
  }

  return true;
}

// Re-export for convenience
export type { FilterState };

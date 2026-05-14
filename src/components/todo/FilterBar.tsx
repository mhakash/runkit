import { useState } from "react";
import { Search, X, Calendar, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useTodoStore, COMPLETED_SECTION_ID } from "@/hooks/useTodoStore";
import type { Priority, FilterDate, FilterStatus } from "@/types/todo";

export function FilterBar() {
  const { filters, setFilter, clearFilters, sections } = useTodoStore();
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomCreated, setShowCustomCreated] = useState(false);

  const isActive = filters.date !== null || filters.createdDate !== null || filters.priority !== null || filters.sectionId !== null || filters.status !== "all" || filters.search !== "";

  const dateOptions: { label: string; value: FilterDate }[] = [
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This week", value: "this_week" },
    { label: "Overdue", value: "overdue" },
    { label: "Custom\u2026", value: "custom" },
  ];

  const statusOptions: { label: string; value: FilterStatus }[] = [
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface-1 flex-wrap">
      {/* Search */}
      <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded px-2 py-1 min-w-[120px]">
        <Search size={11} className="text-text-dim shrink-0" />
        <input
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search..."
          className="bg-transparent text-[11px] text-text placeholder:text-text-dim outline-none w-full"
        />
        {filters.search && (
          <button onClick={() => setFilter("search", "")} className="text-text-dim hover:text-text-muted"><X size={10} /></button>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-0.5 bg-surface-2 border border-border rounded p-0.5">
        {statusOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => setFilter("status", o.value)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all ${filters.status === o.value ? "bg-accent/20 text-accent" : "text-text-dim hover:text-text-muted"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Date */}
      <div className="relative">
        <select
          value={filters.date ?? ""}
          onChange={(e) => {
            const val = e.target.value as FilterDate;
            setFilter("date", val || null);
            if (val === "custom") setShowCustomDate(true);
            else setShowCustomDate(false);
          }}
          className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none cursor-pointer hover:border-border-active transition-colors appearance-none pr-5"
        >
          <option value="">Date</option>
          {dateOptions.map((o) => (
            <option key={o.value} value={o.value ?? ""}>{o.label}</option>
          ))}
        </select>
        <Calendar size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
      </div>

      {showCustomDate && filters.date === "custom" && (
        <div className="flex items-center gap-1">
          <input type="date" value={filters.customDateFrom ?? ""} onChange={(e) => setFilter("customDateFrom", e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none scheme-dark" />
          <span className="text-text-dim text-[10px]">{"\u2013"}</span>
          <input type="date" value={filters.customDateTo ?? ""} onChange={(e) => setFilter("customDateTo", e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none scheme-dark" />
        </div>
      )}

      {/* Created date */}
      <div className="relative">
        <select
          value={filters.createdDate ?? ""}
          onChange={(e) => {
            const val = e.target.value as FilterDate;
            setFilter("createdDate", val || null);
            if (val === "custom") setShowCustomCreated(true);
            else setShowCustomCreated(false);
          }}
          className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none cursor-pointer hover:border-border-active transition-colors appearance-none pr-5"
        >
          <option value="">Created</option>
          {dateOptions.map((o) => (
            <option key={o.value} value={o.value ?? ""}>{o.label}</option>
          ))}
        </select>
        <Calendar size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
      </div>

      {showCustomCreated && filters.createdDate === "custom" && (
        <div className="flex items-center gap-1">
          <input type="date" value={filters.createdDateFrom ?? ""} onChange={(e) => setFilter("createdDateFrom", e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none scheme-dark" />
          <span className="text-text-dim text-[10px]">{"\u2013"}</span>
          <input type="date" value={filters.createdDateTo ?? ""} onChange={(e) => setFilter("createdDateTo", e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none scheme-dark" />
        </div>
      )}

      {/* Priority */}
      <select
        value={filters.priority ?? ""}
        onChange={(e) => setFilter("priority", (e.target.value as Priority) || null)}
        className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none cursor-pointer hover:border-border-active transition-colors appearance-none"
      >
        <option value="">Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {/* Section */}
      <select
        value={filters.sectionId ?? ""}
        onChange={(e) => setFilter("sectionId", e.target.value || null)}
        className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-text-muted outline-none cursor-pointer hover:border-border-active transition-colors appearance-none"
      >
        <option value="">Section</option>
        {sections.filter((s) => s.id !== COMPLETED_SECTION_ID).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Clear */}
      {isActive && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 text-[10px] font-mono text-accent/70 hover:text-accent transition-colors"
        >
          <RotateCcw size={10} /> Clear
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        {isActive && (
          <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded-full bg-accent-dim text-accent border border-accent-dim">
            <SlidersHorizontal size={9} className="inline mr-0.5" />Filtered
          </span>
        )}
      </div>
    </div>
  );
}

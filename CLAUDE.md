# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration Rules

- **Always ask before assuming.** If a requirement is unclear, ambiguous, or could be interpreted multiple ways, stop and ask before writing code.
- **Surface confusions early.** If something about the existing code seems odd or contradicts the task, flag it instead of silently working around it.
- **Propose before implementing large changes.** For anything that touches multiple files or introduces new architecture, present a plan and get confirmation first.

## Project Overview

Runkit is a personal desktop companion app built with Tauri v2 + React + TypeScript. It contains a tab-based shell (like a browser) where each tab can open a home screen and navigate to different tools. Tools are independent, self-contained pages.

## Skills — Always Use Where Applicable

Before writing code, check whether a skill applies and invoke it first:

- **`frontend-design`** — any UI work: new pages, components, layouts, visual polish. Use this to produce production-grade, distinctive interfaces rather than generic output.
- **`vercel-react-best-practices`** — whenever writing or refactoring React components, hooks, data fetching patterns. Ensures optimal performance and idiomatic React.
- **`tauri-v2`** — any Tauri-specific work: `tauri.conf.json`, Rust commands (`#[tauri::command]`), IPC patterns (`invoke`, `emit`, channels), permissions/capabilities, or build troubleshooting.
- **`claude-api`** — if integrating Anthropic/Claude API or `@anthropic-ai/sdk` into any tool.
- **`security-review`** — before shipping any feature that touches the filesystem, shell commands, network requests, or user-supplied input through IPC.

## Tech Stack

- **UI**: shadcn/ui + Tailwind CSS v4
- **Routing**: React Router v7 — one `MemoryRouter` per tab
- **Global State**: Zustand (use only when needed)
- **Forms**: react-hook-form or @tanstack/react-form
- **Package manager**: Bun

## Commands

```bash
bun install               # Install frontend dependencies
bun run dev               # Start Vite dev server only (port 1420)
bun run build             # Build frontend to dist/
bun run tauri dev         # Full dev mode: starts Vite + Rust backend with HMR
bun run tauri build       # Production build (bundles frontend + Rust binary)
```

```bash
# From src-tauri/
cargo build               # Build Rust backend
cargo test                # Run Rust tests
```

## Architecture

### Tab System

Each tab gets its own `<MemoryRouter>` for independent navigation. All tabs are always mounted; inactive tabs use `display: none` to preserve full state (scroll position, loaded PDFs, form inputs). Zustand store (`src/hooks/useTabStore.ts`) manages tab list, active tab, and tab titles.

`TabContext` provides the current `tabId` to child pages so they can update the tab title via `useTabStore`.

### Folder Structure

```
src/
  App.tsx                           — shell: TabBar + TabPanels
  index.css                         — Tailwind v4 directives + CSS custom properties (design tokens)
  components/
    ui/                             — shadcn/ui generated components
    tab-bar/
      TabBar.tsx                    — tab strip with add/close/switch
      Tab.tsx                       — single tab element
    layout/
      TabPanel.tsx                  — MemoryRouter wrapper + display toggle + Routes
      TabContext.tsx                — React context providing current tabId to pages
  pages/
    HomePage.tsx                    — tool grid (reads TOOLS registry)
    HelloWorldPage.tsx              — test tool, uses greet Rust command
    PdfReaderPage.tsx               — PDF reader with file picker
  hooks/
    useTabStore.ts                  — Zustand store for tabs
  lib/
    utils.ts                        — shadcn cn() utility
    tools.ts                        — TOOLS registry (add new tools here)
  types/
    tab.ts                          — Tab interface
```

### Adding a New Tool

1. Add an entry to `src/lib/tools.ts` (TOOLS array)
2. Create `src/pages/YourToolPage.tsx`
3. Add a `<Route>` in `src/components/layout/TabPanel.tsx`

### IPC Pattern (Frontend ↔ Rust)

- **Frontend**: `invoke("command_name", { arg })` from `@tauri-apps/api/core`
- **Backend**: Rust functions annotated with `#[tauri::command]`, registered in `src-tauri/src/lib.rs`
- New Tauri plugins require: adding to `Cargo.toml`, registering in `lib.rs`, and adding permissions in `src-tauri/capabilities/default.json`

### Design Tokens

Design tokens are CSS custom properties defined in `src/index.css` under `@theme`. Key tokens: `--color-surface`, `--color-accent`, `--color-text`, `--font-display`, `--font-body`. Always use these instead of hardcoded colors.

### Build Flow

Dev: Vite serves frontend at `localhost:1420` → Tauri loads it in a native window  
Prod: `bun run build` → `dist/` → Tauri bundles with Rust binary

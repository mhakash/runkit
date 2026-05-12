# Runkit

A personal desktop companion app built with Tauri + React + TypeScript. Tab-based shell where each tab runs its own navigation context.

## Features

**Shell**
- Multi-tab interface — open, close, and switch tabs independently
- Each tab preserves full state (scroll position, open tools, form inputs) when inactive
- Window size and position persist across sessions

**PDF Reader**
- Open PDFs from disk with a native file picker
- Continuous scroll and single-page view modes
- Zoom in/out, go-to-page input
- Collapsible bookmarks/TOC sidebar
- Back/forward navigation history for bookmark jumps and page seeks
- Recent PDFs list with last-read page restored on reopen

## Stack

Tauri v2 · React · TypeScript · Tailwind CSS v4 · shadcn/ui · Zustand · React Router v7

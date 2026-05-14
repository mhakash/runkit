export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  badge?: string;
  singleton?: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: "hello-world",
    name: "Hello World",
    description: "A simple test tool to verify the Rust IPC bridge is working.",
    icon: "👋",
    path: "/tool/hello-world",
    badge: "Test",
  },
  {
    id: "pdf-reader",
    name: "PDF Reader",
    description: "Open and read PDF documents from your filesystem.",
    icon: "📄",
    path: "/tool/pdf-reader",
    badge: "New",
  },
  {
    id: "todo",
    name: "Todo",
    description: "Feature-rich task manager with sections, priorities, due dates, and filters.",
    icon: "✓",
    path: "/tool/todo",
    singleton: true,
  },
];

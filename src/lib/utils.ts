import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileNameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

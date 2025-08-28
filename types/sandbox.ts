// Global types for sandbox file management

export interface SandboxFile {
  content: string;
  lastModified: number;
}

export interface SandboxFileCache {
  files: Record<string, SandboxFile>;
  lastSync: number;
  sandboxId: string;
  manifest?: any; // FileManifest type from file-manifest.ts
}

export interface SandboxState {
  fileCache: SandboxFileCache | null;
  sandboxId: string | null;
  sandboxData: {
    sandboxId: string;
    url: string;
  } | null;
}

// Declare global types
declare global {
  var activeSandboxId: string | null;
  var sandboxState: SandboxState;
  var existingFiles: Set<string>;
}

export {};
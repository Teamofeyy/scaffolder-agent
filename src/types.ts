export interface MasterConfig {
  appName: string;
  packageManager: string;
  framework: string;
  routing: string;
  styling: string;
  stateManager: string;
  linting?: 'eslint' | 'biome' | 'none';
  extraDependencies?: string[];
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type Framework = 'react' | 'vue' | 'svelte' | 'nextjs';

export interface BuildResult {
  success: boolean;
  projectPath?: string;
  archivePath?: string;
  archiveName?: string;
  error?: string;
}


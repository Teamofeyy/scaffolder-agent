import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const tailwindPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {
      devDependencies: {
        tailwindcss: '^4.0.0',
        '@tailwindcss/postcss': '^4.0.0',
        autoprefixer: '^10.4.20',
      },
    };
  },

  getModifications(config: MasterConfig): PluginModification[] {
    const modifications: PluginModification[] = [];

    // Add Tailwind import to CSS
    let cssFile: string;

    switch (config.framework) {
      case 'vue':
        cssFile = 'src/style.css';
        break
      case 'nextjs':
        cssFile = 'src/app/globals.css';
        break;
      default:
        cssFile = 'src/index.css';
        break;
    }

    modifications.push({
      file: cssFile,
      type: 'append',
      content: '@import "tailwindcss";\n',
    });

    // Update or create vite.config.ts
    modifications.push({
      file: 'vite.config.ts',
      type: 'replace',
      pattern: 'module.exports',
      replacement: `module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};`,
    });

    return modifications;
  },

  getAdditionalFiles(config: MasterConfig) {
    const isTypeScript = config.framework === 'react' || config.framework === 'nextjs';
    const ext = isTypeScript ? 'ts' : 'js';

    return [
      {
        path: `tailwind.config.${ext}`,
        content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`,
      },
    ];
  },
};



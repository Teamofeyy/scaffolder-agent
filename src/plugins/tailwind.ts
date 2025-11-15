import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const tailwindPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    const isNext = config.framework === 'nextjs';

    if (isNext) {
      return {
        devDependencies: {
          "@tailwindcss/postcss": "^4",
          "tailwindcss": "^4",
        },
      };
    }

    return {
      dependencies: {
        "@tailwindcss/vite": "^4.1.17",
        "tailwindcss": "^4.1.17",
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


    if (config.framework !== 'nextjs') {
      modifications.push({
        file: 'vite.config.ts',
        type: 'replace',
        pattern: 'import',
        replacement: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})`,
      });
    }
    return modifications;
  },

  getAdditionalFiles(config: MasterConfig) {
    if (config.framework === 'nextjs') {
      return [
        {
          path: 'postcss.config.mjs',
          content: `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;`
        }
      ]
    }
    return [];
  }
};




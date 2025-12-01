import { MasterConfig } from '../types';

export interface PluginDependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PluginModification {
  file: string;
  type: 'replace' | 'append' | 'prepend';
  pattern?: string;
  replacement?: string;
  content?: string;
}

export interface Plugin {
  getDependencies(config: MasterConfig): PluginDependencies;
  getModifications(config: MasterConfig): PluginModification[];
  getAdditionalFiles?(config: MasterConfig): Array<{ path: string; content: string }>;
}

import { reactRouterPlugin } from './react-router';
import { vueRouterPlugin } from './vue-router';
import { reduxToolkitPlugin } from './redux-toolkit';
import { zustandPlugin } from './zustand';
import { piniaPlugin } from './pinia';
import { tailwindPlugin } from './tailwind';
import { cssModulesPlugin } from './css-modules';

export function getPlugins(config: MasterConfig): Plugin[] {
  const plugins: Plugin[] = [];

  // Routing plugins
  if (config.routing === 'react-router' && config.framework === 'react') {
    plugins.push(reactRouterPlugin);
  } else if (config.routing === 'vue-router' && config.framework === 'vue') {
    plugins.push(vueRouterPlugin);
  }

  // State management plugins
  if (config.stateManager === 'redux-toolkit' && config.framework === 'react') {
    plugins.push(reduxToolkitPlugin);
  } else if (config.stateManager === 'zustand' && config.framework === 'react') {
    plugins.push(zustandPlugin);
  } else if (config.stateManager === 'pinia' && config.framework === 'vue') {
    plugins.push(piniaPlugin);
  }

  // Styling plugins
  if (config.styling === 'tailwind') {
    plugins.push(tailwindPlugin);
  } else if (config.styling === 'css-modules') {
    // CSS Modules плагин имеет смысл только для Vite-проектов (React/Vue),
    // для Next.js он может создавать лишние артефакты (`src/types/...`).
    if (config.framework === 'react' || config.framework === 'vue') {
      plugins.push(cssModulesPlugin);
    }
  }

  return plugins;
}


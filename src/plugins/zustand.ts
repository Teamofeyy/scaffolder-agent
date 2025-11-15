import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const zustandPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {
      dependencies: {
        zustand: '^4.4.7',
      },
    };
  },

  getModifications(config: MasterConfig): PluginModification[] {
    // Zustand doesn't need file modifications typically
    return [];
  },

  getAdditionalFiles(config: MasterConfig) {
    const isTypeScript = config.framework === 'react' || config.framework === 'nextjs';
    const ext = isTypeScript ? 'ts' : 'js';

    return [
      {
        path: `src/store/useStore.${ext}`,
        content: `import { create } from 'zustand';

interface StoreState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));`,
      },
    ];
  },
};




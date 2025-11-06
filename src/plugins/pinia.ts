import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const piniaPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {
      dependencies: {
        pinia: '^2.1.7',
      },
    };
  },

  getModifications(config: MasterConfig): PluginModification[] {
    return [
      {
        file: 'src/main.ts',
        type: 'append',
        content: "import { createPinia } from 'pinia';\n",
      },
      {
        file: 'src/main.ts',
        type: 'replace',
        pattern: 'app.mount',
        replacement: 'app.use(createPinia()).mount',
      },
    ];
  },

  getAdditionalFiles(config: MasterConfig) {
    return [
      {
        path: 'src/stores/counter.ts',
        content: `import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  actions: {
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
  },
});`,
      },
    ];
  },
};



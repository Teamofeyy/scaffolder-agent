import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const vueRouterPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {
      dependencies: {
        'vue-router': '^4.2.5',
      },
    };
  },

  getModifications(config: MasterConfig): PluginModification[] {
    return [
      {
        file: 'src/main.ts',
        type: 'append',
        content: "import { createRouter, createWebHistory } from 'vue-router';\n",
      },
      {
        file: 'src/main.ts',
        type: 'replace',
        pattern: 'app.mount',
        replacement: 'app.use(createRouter({ history: createWebHistory(), routes: [] })).mount',
      },
    ];
  },

  getAdditionalFiles(config: MasterConfig) {
    return [
      {
        path: 'src/router/index.ts',
        content: `import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import About from '../views/About.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

export default router;`,
      },
    ];
  },
};



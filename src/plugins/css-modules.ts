import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const cssModulesPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {};
  },

  getModifications(config: MasterConfig): PluginModification[] {
    return [];
  },

  getAdditionalFiles(config: MasterConfig) {
    const isTypeScript = config.framework === 'react' || config.framework === 'nextjs';
    
    if (!isTypeScript) {
      return [];
    }

    return [
      {
        path: 'src/types/css-modules.d.ts',
        content: `declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}`,
      },
    ];
  },
};



import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const reactRouterPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    const deps: PluginDependencies = {
      dependencies: {
        'react-router-dom': '^6.20.0',
      },
    };

    // TypeScript types if needed (can be detected from tsconfig.json or framework)
    if (config.framework === 'react') {
      // Assume TypeScript if framework supports it
      deps.devDependencies = {
        '@types/react-router-dom': '^5.3.3',
      };
    }

    return deps;
  },

  getModifications(config: MasterConfig): PluginModification[] {
    const modifications: PluginModification[] = [];

    // Determine entry point based on framework
    const entryFile = config.framework === 'nextjs' 
      ? 'src/app/layout.tsx'
      : config.framework === 'react'
      ? 'src/main.tsx'
      : 'src/main.jsx';

    // Add import
    modifications.push({
      file: entryFile,
      type: 'append',
      content: "import { BrowserRouter } from 'react-router-dom';\n",
    });

    // Wrap app in BrowserRouter
    modifications.push({
      file: entryFile,
      type: 'replace',
      pattern: '<App />',
      replacement: '<BrowserRouter><App /></BrowserRouter>',
    });

    return modifications;
  },

  getAdditionalFiles(config: MasterConfig) {
    const isTypeScript = config.framework === 'react' || config.framework === 'nextjs';
    const ext = isTypeScript ? 'tsx' : 'jsx';

    return [
      {
        path: `src/routes/index.${ext}`,
        content: `import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import About from '../pages/About';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}`,
      },
      {
        path: `src/pages/Home.${ext}`,
        content: `export default function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to your app!</p>
    </div>
  );
}`,
      },
      {
        path: `src/pages/About.${ext}`,
        content: `export default function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>Learn more about us.</p>
    </div>
  );
}`,
      },
    ];
  },
};




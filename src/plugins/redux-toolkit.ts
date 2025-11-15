import { MasterConfig } from '../types';
import { Plugin, PluginDependencies, PluginModification } from './index';

export const reduxToolkitPlugin: Plugin = {
  getDependencies(config: MasterConfig): PluginDependencies {
    return {
      dependencies: {
        '@reduxjs/toolkit': '^2.0.0',
        'react-redux': '^9.0.0',
      },
      devDependencies: {
        '@types/react-redux': '^9.0.0',
      },
    };
  },

  getModifications(config: MasterConfig): PluginModification[] {
    const modifications: PluginModification[] = [];
    const entryFile = config.framework === 'nextjs'
      ? 'src/app/layout.tsx'
      : 'src/main.tsx';

    // Add imports
    modifications.push({
      file: entryFile,
      type: 'append',
      content: "import { Provider } from 'react-redux';\nimport { store } from './store';\n",
    });

    // Wrap with Provider
    modifications.push({
      file: entryFile,
      type: 'replace',
      pattern: '<App />',
      replacement: '<Provider store={store}><App /></Provider>',
    });

    return modifications;
  },

  getAdditionalFiles(config: MasterConfig) {
    const isTypeScript = config.framework === 'react' || config.framework === 'nextjs';
    const ext = isTypeScript ? 'ts' : 'js';

    return [
      {
        path: `src/store/index.${ext}`,
        content: `import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;`,
      },
      {
        path: `src/store/counterSlice.${ext}`,
        content: `import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;`,
      },
    ];
  },
};




import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { ProjectBuilder } from './builder';
import { MasterConfig, BuildResult, Framework } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Agent is running' });
});

/**
 * Build endpoint - собирает проект и возвращает ZIP архив
 * 
 * Поток работы:
 * 1. Валидация запроса
 * 2. Создание временной директории для проекта
 * 3. Копирование шаблона
 * 4. Патчинг package.json
 * 5. Применение модификаций от плагинов
 * 6. Установка зависимостей
 * 7. Создание ZIP архива
 * 8. Отправка архива клиенту
 * 9. Удаление временных файлов
 */
function validateConfig(config: MasterConfig): string | null {
  const framework = config.framework as Framework;

  const allowedFrameworks: Framework[] = ['react', 'vue', 'svelte', 'nextjs'];
  if (!allowedFrameworks.includes(framework)) {
    return `Unsupported framework: ${config.framework}`;
  }

  // Routing compatibility
  // Для Next.js по умолчанию считаем, что используется app router,
  // даже если фронт не прислал routing вообще.
  const routing =
    framework === 'nextjs'
      ? (config.routing || 'app')
      : (config.routing || 'none');
  if (framework === 'react') {
    const allowed = ['none', 'react-router'];
    if (!allowed.includes(routing)) {
      return `Routing "${routing}" is not supported for React`;
    }
  } else if (framework === 'vue') {
    const allowed = ['none', 'vue-router'];
    if (!allowed.includes(routing)) {
      return `Routing "${routing}" is not supported for Vue`;
    }
  } else if (framework === 'svelte') {
    if (routing !== 'none') {
      return `Custom routing is not supported for Svelte in this builder`;
    }
  } else if (framework === 'nextjs') {
    // Поддерживаем явные значения и "none" как синоним app router,
    // чтобы старый фронт, который не знает про routing, тоже работал.
    const allowed = ['none', 'app', 'app-router', 'pages', 'pages-router'];
    if (!allowed.includes(routing)) {
      return `Routing "${routing}" is not supported for Next.js`;
    }
  }

  // Styling compatibility
  const styling = config.styling || 'none';
  if (framework === 'react' || framework === 'vue') {
    const allowed = ['none', 'tailwind', 'css-modules'];
    if (!allowed.includes(styling)) {
      return `Styling "${styling}" is not supported for ${framework}`;
    }
  } else if (framework === 'svelte') {
    const allowed = ['none', 'tailwind'];
    if (!allowed.includes(styling)) {
      return `Styling "${styling}" is not supported for Svelte`;
    }
  } else if (framework === 'nextjs') {
    const allowed = ['none', 'tailwind'];
    if (!allowed.includes(styling)) {
      return `Styling "${styling}" is not supported for Next.js`;
    }
  }

  // State manager compatibility
  const state = config.stateManager || 'none';
  if (framework === 'react') {
    const allowed = ['none', 'redux-toolkit', 'zustand'];
    if (!allowed.includes(state)) {
      return `State manager "${state}" is not supported for React`;
    }
  } else if (framework === 'vue') {
    const allowed = ['none', 'pinia'];
    if (!allowed.includes(state)) {
      return `State manager "${state}" is not supported for Vue`;
    }
  } else if (framework === 'svelte' || framework === 'nextjs') {
    if (state !== 'none') {
      return `State manager "${state}" is not supported for ${framework} in this builder`;
    }
  }

  // Linting compatibility: используем только для Next.js,
  // для остальных фреймворков опция игнорируется/не поддерживается.
  if (framework === 'nextjs') {
    const linting = config.linting || 'eslint';
    const allowedLinting: Array<'eslint' | 'biome' | 'none'> = ['eslint', 'biome', 'none'];
    if (!allowedLinting.includes(linting)) {
      return `Linting "${linting}" is not supported for Next.js`;
    }
  } else if (config.linting) {
    return `Linting option is only supported for Next.js projects`;
  }

  return null;
}

app.post('/build', async (req, res) => {
  let builder: ProjectBuilder | null = null;
  let archivePath: string | undefined;

  try {
    const config: MasterConfig = req.body;

    // Validate required fields
    if (!config.appName || !config.framework || !config.packageManager) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: appName, framework, packageManager',
      });
    }

    const compatibilityError = validateConfig(config);
    if (compatibilityError) {
      return res.status(400).json({
        success: false,
        error: compatibilityError,
      });
    }

    console.log(`🚀 Starting build for project: ${config.appName}`);
    console.log(`   Framework: ${config.framework}`);
    console.log(`   Package Manager: ${config.packageManager}`);
    console.log(`   Routing: ${config.routing || 'none'}`);
    console.log(`   Styling: ${config.styling || 'none'}`);
    console.log(`   State Manager: ${config.stateManager || 'none'}`);

    // Build project
    builder = new ProjectBuilder(config);
    const result: BuildResult = await builder.build();

    if (!result.success || !result.archivePath) {
      console.error(`❌ Build failed: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || 'Build failed',
      });
    }

    archivePath = result.archivePath;
    console.log(`✅ Build completed successfully`);
    console.log(`   Archive: ${archivePath}`);

    // Проверяем существование архива
    try {
      await fs.access(archivePath);
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Archive file not found',
      });
    }

    // Отправляем ZIP архив
    const archiveName = result.archiveName || path.basename(archivePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
    
    // Отправляем файл
    const fileStream = fsSync.createReadStream(archivePath);
    fileStream.pipe(res);

    // После отправки файла удаляем временные данные
    fileStream.on('end', async () => {
      // Удаляем временные файлы проекта
      if (builder) {
        await builder.cleanup();
      }
      
      // Удаляем архив после небольшой задержки (на случай если клиент еще качает)
      setTimeout(async () => {
        if (archivePath && builder) {
          await builder.cleanupArchive(archivePath);
        }
      }, 5000); // 5 секунд задержка
    });

    fileStream.on('error', async (error: Error) => {
      console.error('Error sending archive:', error);
      
      // Очистка при ошибке
      if (builder) {
        await builder.cleanup();
        if (archivePath) {
          await builder.cleanupArchive(archivePath);
        }
      }
    });

  } catch (error: any) {
    console.error('Error in build endpoint:', error);
    
    // Очистка при ошибке
    if (builder) {
      await builder.cleanup();
      if (archivePath) {
        await builder.cleanupArchive(archivePath);
      }
    }

    // Если ответ еще не отправлен
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Agent server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Build endpoint: POST http://localhost:${PORT}/build`);
});


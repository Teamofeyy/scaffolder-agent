import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { ProjectBuilder } from './builder';
import { MasterConfig, BuildResult } from './types';

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


import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { copy } from './helpers/copy';
import { install } from './helpers/install';
import { getPlugins } from './plugins';
import { MasterConfig, BuildResult, PackageManager } from './types';
import { async as glob } from 'fast-glob';
import { Sema } from 'async-sema';

export class ProjectBuilder {
  private workDir: string;
  private projectPath: string;
  private archiveDir: string;

  constructor(private config: MasterConfig) {
    // Временная директория для сборки проекта
    this.workDir = path.join(os.tmpdir(), 'project-builds');
    this.projectPath = path.join(this.workDir, config.appName);
    // Директория для архивов
    this.archiveDir = path.join(os.tmpdir(), 'project-archives');
  }

  async build(): Promise<BuildResult> {
    try {
      // Create work directory
      await fs.mkdir(this.workDir, { recursive: true });

      // Step 1: Copy template
      console.log('📦 Copying template...');
      await this.copyTemplate();

      // Step 2: Patch package.json
      console.log('📝 Patching package.json...');
      await this.patchPackageJson();

      // Step 3: Apply plugin modifications
      console.log('🔧 Applying plugin modifications...');
      await this.applyModifications();

      // Step 4: Create additional files
      console.log('📄 Creating additional files...');
      await this.createAdditionalFiles();

      // Step 5: Install dependencies
      console.log('📥 Installing dependencies...');

      // Step 6: Create ZIP archive
      console.log('📦 Creating archive...');
      const archivePath = await this.createArchive();

      return {
        success: true,
        projectPath: this.projectPath,
        archivePath: archivePath,
        archiveName: path.basename(archivePath),
      };
    } catch (error: any) {
      console.error('Build failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  private async copyTemplate() {
    // Get template path
    // For now, we'll use a local template or create-vite
    // You can modify this to use create-vite or local templates
    const templatePath = this.getTemplatePath();

    if (!templatePath) {
      throw new Error(`Template not found for framework: ${this.config.framework}`);
    }

    // Copy template files
    await copy('**/*', this.projectPath, {
      cwd: templatePath,
      parents: true,
      rename(name) {
        if (name === 'gitignore') {
          return '.gitignore';
        }
        if (name === 'README-template.md') {
          return 'README.md';
        }
        return name;
      },
    });
  }

  private getTemplatePath(): string | null {
    if (this.config.framework === 'nextjs') {
      return this.getNextTemplatePath();
    }

    // Option 1: Use local templates (if you have them)
    const localTemplatePath = path.join(
      __dirname,
      '..',
      'templates',
      this.config.framework,
      'ts' // or 'js' based on TypeScript preference
    );

    try {
      // Check if local template exists
      if (fsSync.existsSync(localTemplatePath)) {
        return localTemplatePath;
      }
    } catch {
      // Local template doesn't exist
    }

    // Option 2: Use create-vite templates from node_modules
    // For React: node_modules/create-vite/template-react-ts or template-react
    // For Vue: node_modules/create-vite/template-vue-ts or template-vue
    // For Svelte: node_modules/create-vite/template-svelte-ts or template-svelte

    const createViteTemplates: Record<string, string> = {
      react: 'template-react-ts',
      vue: 'template-vue-ts',
      svelte: 'template-svelte-ts',
    };

    const templateName = createViteTemplates[this.config.framework];
    if (templateName) {
      const createVitePath = path.join(
        process.cwd(),
        'node_modules',
        'create-vite',
        templateName
      );

      if (fsSync.existsSync(createVitePath)) {
        return createVitePath;
      }
    }

    // Template not found
    return null;
  }

  private getNextTemplatePath(): string | null {
    const routing =
      this.config.routing === 'pages-router' || this.config.routing === 'pages'
        ? 'pages'
        : 'app';
    const tailwind = this.config.styling === 'tailwind' ? 'tail' : 'notail';
    const linting =
      this.config.linting === 'biome'
        ? 'biome'
        : this.config.linting === 'none'
          ? 'no'
          : 'es';

    const templateDir = `${routing}-${tailwind}-${linting}`;
    const templatePath = path.join(__dirname, 'templates', 'nextjs', templateDir);

    if (fsSync.existsSync(templatePath)) {
      return templatePath;
    }

    console.warn(
      `⚠️ Next.js template "${templateDir}" not found. Ensure templates/nextjs/${templateDir} exists.`
    );
    return null;
  }

  private async patchPackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json');

    // Read existing package.json
    let packageJson: any;
    try {
      const content = await fs.readFile(packageJsonPath, 'utf8');
      packageJson = JSON.parse(content);
    } catch (error) {
      // If package.json doesn't exist, create a basic one
      packageJson = this.createBasePackageJson();
    }

    // Update name
    packageJson.name = this.config.appName;

    // Collect dependencies from all plugins
    const plugins = getPlugins(this.config);
    let allDependencies: Record<string, string> = {};
    let allDevDependencies: Record<string, string> = {};

    for (const plugin of plugins) {
      const pluginDeps = plugin.getDependencies(this.config);
      if (pluginDeps.dependencies) {
        allDependencies = { ...allDependencies, ...pluginDeps.dependencies };
      }
      if (pluginDeps.devDependencies) {
        allDevDependencies = { ...allDevDependencies, ...pluginDeps.devDependencies };
      }
    }

    // Merge dependencies
    packageJson.dependencies = {
      ...(packageJson.dependencies || {}),
      ...allDependencies,
    };

    packageJson.devDependencies = {
      ...(packageJson.devDependencies || {}),
      ...allDevDependencies,
    };

    // Remove empty devDependencies
    if (Object.keys(packageJson.devDependencies || {}).length === 0) {
      delete packageJson.devDependencies;
    }

    // Write back
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + os.EOL,
      'utf8'
    );
  }

  private createBasePackageJson(): any {
    const baseConfigs: Record<string, any> = {
      react: {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          '@vitejs/plugin-react': '^4.2.1',
          typescript: '^5.0.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
      },
      vue: {
        dependencies: {
          vue: '^3.4.15',
        },
        devDependencies: {
          vite: '^5.0.0',
          '@vitejs/plugin-vue': '^5.0.0',
          typescript: '^5.0.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
      },
      svelte: {
        dependencies: {
          svelte: '^4.2.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          '@sveltejs/vite-plugin-svelte': '^3.0.0',
          typescript: '^5.0.0',
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
      },
      nextjs: {
        dependencies: {
          next: '16.0.6',
          react: '19.2.0',
          'react-dom': '19.2.0',
        },
        devDependencies: {
          "@tailwindcss/postcss": "^4",
          "@types/node": "^20",
          "@types/react": "^19",
          "@types/react-dom": "^19",
          "eslint": "^9",
          "eslint-config-next": "16.0.6",
          "tailwindcss": "^4",
          "typescript": "^5"
        },
        scripts: {
          "dev": "next dev",
          "build": "next build",
          "start": "next start",
          "lint": "eslint"
        },
      },
    };

    const base = baseConfigs[this.config.framework] || baseConfigs.react;

    return {
      name: this.config.appName,
      version: '0.1.0',
      private: true,
      ...base,
    };
  }

  private async applyModifications() {
    const plugins = getPlugins(this.config);
    const allModifications: Array<{
      file: string;
      type: 'replace' | 'append' | 'prepend';
      pattern?: string;
      replacement?: string;
      content?: string;
    }> = [];

    // Collect all modifications
    for (const plugin of plugins) {
      const mods = plugin.getModifications(this.config);
      allModifications.push(...mods);
    }

    // Group by file
    const fileGroups = new Map<string, typeof allModifications>();
    for (const mod of allModifications) {
      const existing = fileGroups.get(mod.file) || [];
      existing.push(mod);
      fileGroups.set(mod.file, existing);
    }

    // Apply modifications
    const writeSema = new Sema(8);
    await Promise.all(
      Array.from(fileGroups.entries()).map(async ([file, mods]) => {
        await writeSema.acquire();
        try {
          await this.applyFileModifications(file, mods);
        } finally {
          writeSema.release();
        }
      })
    );
  }

  private async applyFileModifications(
    relativePath: string,
    modifications: Array<{
      file: string;
      type: 'replace' | 'append' | 'prepend';
      pattern?: string;
      replacement?: string;
      content?: string;
    }>
  ) {
    const filePath = path.join(this.projectPath, relativePath);

    // Read file
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, create it
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    }

    // Apply modifications
    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          if (mod.pattern && mod.replacement !== undefined) {
            content = content.replace(new RegExp(mod.pattern, 'g'), mod.replacement);
          }
          break;
        case 'append':
          if (mod.content) {
            content += mod.content;
          }
          break;
        case 'prepend':
          if (mod.content) {
            content = mod.content + content;
          }
          break;
      }
    }

    // Write back
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async createAdditionalFiles() {
    const plugins = getPlugins(this.config);

    for (const plugin of plugins) {
      if (plugin.getAdditionalFiles) {
        const files = plugin.getAdditionalFiles(this.config);
        for (const file of files) {
          const filePath = path.join(this.projectPath, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content, 'utf8');
        }
      }
    }
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Создает ZIP архив проекта
   * Исключает node_modules, .git и другие временные файлы
   */
  private async createArchive(): Promise<string> {
    // Создаем директорию для архивов если не существует
    await fs.mkdir(this.archiveDir, { recursive: true });

    const archiveName = `${this.config.appName}-${Date.now()}.zip`;
    const archivePath = path.join(this.archiveDir, archiveName);

    return new Promise<string>(async (resolve, reject) => {
      const output = fsSync.createWriteStream(archivePath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Максимальное сжатие
      });

      output.on('close', () => {
        console.log(`✅ Archive created: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Отправляем архив в файл
      archive.pipe(output);

      try {
        // Получаем все файлы проекта, исключая ненужные
        const excludePatterns = [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/.cache/**',
          '**/dist/**',
          '**/build/**',
          '**/.DS_Store',
          '**/*.log',
        ];

        const allFiles = await glob('**/*', {
          cwd: this.projectPath,
          dot: true,
          absolute: false,
          ignore: excludePatterns,
        });

        // Добавляем каждый файл в архив
        for (const file of allFiles) {
          const filePath = path.join(this.projectPath, file);
          const archiveEntryPath = path.join(this.config.appName, file);

          // Проверяем, что это файл, а не директория
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            archive.file(filePath, { name: archiveEntryPath });
          }
        }

        // Завершаем архивацию
        archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Удаляет временные файлы проекта
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up temporary files...');
      await fs.rm(this.projectPath, { recursive: true, force: true });
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️ Error during cleanup:', error);
      // Не бросаем ошибку, так как это не критично
    }
  }

  /**
   * Удаляет архив
   */
  async cleanupArchive(archivePath: string): Promise<void> {
    try {
      await fs.unlink(archivePath);
      console.log(`✅ Archive deleted: ${archivePath}`);
    } catch (error) {
      console.error('⚠️ Error deleting archive:', error);
    }
  }
}


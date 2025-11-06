# 📁 Структура кода API Agent

## Быстрый обзор

```
api-agent/
├── src/
│   ├── index.ts              # Express сервер - точки входа
│   ├── builder.ts            # ProjectBuilder - логика сборки
│   ├── types.ts              # TypeScript типы
│   ├── helpers/              # Утилиты
│   └── plugins/              # Плагины для расширения
└── package.json
```

## 📄 Файлы и их назначение

### `src/index.ts` - Express сервер

**Что делает:**
- Создает Express приложение
- Настраивает CORS и JSON парсинг
- Обрабатывает запросы

**Основные функции:**
- `GET /health` - проверка здоровья сервера
- `POST /build` - главный endpoint для сборки

**Поток обработки `/build`:**
1. Валидация запроса
2. Создание `ProjectBuilder`
3. Вызов `builder.build()`
4. Отправка ZIP архива
5. Очистка временных файлов

### `src/builder.ts` - ProjectBuilder класс

**Что делает:**
- Собирает проект по шагам
- Управляет временными директориями
- Создает ZIP архив

**Основные методы:**

```typescript
async build(): Promise<BuildResult>
  // Главный метод - выполняет всю сборку
  
private async copyTemplate()
  // Копирует шаблон фреймворка
  
private async patchPackageJson()
  // Патчит package.json - добавляет зависимости от плагинов
  
private async applyModifications()
  // Применяет модификации файлов (replace/append/prepend)
  
private async createAdditionalFiles()
  // Создает дополнительные файлы от плагинов
  
private async createArchive(): Promise<string>
  // Создает ZIP архив (без node_modules)
  
async cleanup()
  // Удаляет временную директорию проекта
  
async cleanupArchive(path)
  // Удаляет архив
```

**Важные поля:**
- `workDir` - `/tmp/project-builds/` - где собирается проект
- `projectPath` - `/tmp/project-builds/my-app/` - конкретный проект
- `archiveDir` - `/tmp/project-archives/` - где хранятся архивы

### `src/helpers/` - Утилиты

#### `copy.ts`
- Копирование файлов из шаблона
- Поддержка переименования (gitignore → .gitignore)
- Использует `fast-glob` для поиска файлов

#### `install.ts`
- Установка зависимостей через package manager
- Поддержка npm, pnpm, yarn, bun
- Использует `cross-spawn` для запуска команд

### `src/plugins/` - Плагины

**Структура плагина:**
```typescript
interface Plugin {
  getDependencies(config): PluginDependencies
  getModifications(config): PluginModification[]
  getAdditionalFiles(config): FileDefinition[]
}
```

**Примеры плагинов:**
- `react-router.ts` - добавляет React Router
- `redux-toolkit.ts` - добавляет Redux Toolkit
- `tailwind.ts` - добавляет Tailwind CSS

**Как работают:**
1. `getDependencies()` - возвращает зависимости для `package.json`
2. `getModifications()` - возвращает изменения файлов
3. `getAdditionalFiles()` - возвращает новые файлы

## 🔄 Поток данных

### Сборка проекта:

```
index.ts (POST /build)
    ↓
ProjectBuilder.build()
    ↓
1. copyTemplate()           → Копирует шаблон
    ↓
2. patchPackageJson()       → Патчит package.json
    ↓
3. applyModifications()     → Изменяет файлы
    ↓
4. createAdditionalFiles()  → Создает файлы
    ↓
5. install()                → npm install
    ↓
6. createArchive()          → Создает ZIP
    ↓
index.ts (отправка архива)
    ↓
cleanup()                   → Удаление временных файлов
```

### Патчинг package.json:

```
Базовый package.json (из шаблона)
    ↓
Для каждого плагина:
  plugin.getDependencies()
    ↓
Мерджим dependencies и devDependencies
    ↓
Сохраняем package.json
```

### Модификация файлов:

```
Собираем все модификации от плагинов
    ↓
Группируем по файлам
    ↓
Для каждого файла:
  Читаем файл
  Применяем модификации (replace/append/prepend)
  Сохраняем файл
```

## 🎯 Как настроить

### Изменить временные директории

В `builder.ts`:
```typescript
constructor(private config: MasterConfig) {
  // Изменить пути
  this.workDir = '/custom/path/builds';
  this.archiveDir = '/custom/path/archives';
}
```

### Изменить задержку удаления архива

В `index.ts`:
```typescript
setTimeout(async () => {
  // Изменить задержку (в миллисекундах)
}, 10000); // 10 секунд вместо 5
```

### Добавить новый плагин

1. Создать `src/plugins/my-plugin.ts`:
```typescript
export const myPlugin: Plugin = {
  getDependencies: (config) => ({
    dependencies: { 'my-package': '^1.0.0' }
  }),
  getModifications: (config) => [...],
  getAdditionalFiles: (config) => [...]
};
```

2. Добавить в `src/plugins/index.ts`:
```typescript
if (config.myFeature === 'my-plugin') {
  plugins.push(myPlugin);
}
```

### Изменить шаблоны

В `builder.ts`, метод `getTemplatePath()`:
- Локальные шаблоны: `templates/{framework}/ts/`
- Из create-vite: `node_modules/create-vite/template-{framework}-ts/`

## 📊 Временные директории

### Во время работы:
```
/tmp/
├── project-builds/
│   └── my-app/              ← Проект собирается здесь
│       ├── src/
│       ├── package.json
│       └── node_modules/    ← После npm install
└── project-archives/
    └── my-app-1234567890.zip ← Архив создается здесь
```

### После завершения:
```
/tmp/
├── project-builds/          ← Очищено (cleanup())
└── project-archives/        ← Очищено через 5 сек (cleanupArchive())
```

## 🔍 Отладка

### Посмотреть логи
Агент выводит подробные логи:
```
🚀 Starting build for project: my-app
📦 Copying template...
📝 Patching package.json...
🔧 Applying plugin modifications...
📄 Creating additional files...
📥 Installing dependencies...
📦 Creating archive...
✅ Archive created: /tmp/project-archives/my-app-1234567890.zip
✅ Build completed successfully
🧹 Cleaning up temporary files...
✅ Cleanup completed
✅ Archive deleted: /tmp/project-archives/my-app-1234567890.zip
```

### Проверить собранный проект

Временно отключите очистку в `index.ts`:
```typescript
// Закомментируйте cleanup()
// if (builder) {
//   await builder.cleanup();
// }
```

Затем проверьте `/tmp/project-builds/my-app/`

### Проверить архив

Архив создается в `/tmp/project-archives/` перед отправкой. Можно проверить его содержимое.



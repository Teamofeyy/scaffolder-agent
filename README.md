# API Agent - Project Builder

TypeScript/Express агент для сборки фронтенд-проектов.

## Установка

```bash
npm install
```

### Установка шаблонов create-vite (опционально)

Если вы хотите использовать шаблоны из `create-vite` вместо локальных:

```bash
npm install create-vite
```

Это позволит использовать шаблоны React, Vue и Svelte из node_modules.

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API

### POST /build

Принимает конфигурацию проекта и собирает его.

**Request Body:**
```json
{
  "appName": "my-app",
  "packageManager": "npm",
  "framework": "react",
  "routing": "react-router",
  "styling": "tailwind",
  "stateManager": "redux-toolkit"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project built successfully",
  "projectPath": "/tmp/project-builds/my-app"
}
```

### GET /health

Проверка здоровья агента.

## Поддерживаемые фреймворки

- `react` - React + Vite
- `vue` - Vue + Vite
- `svelte` - Svelte + Vite
- `nextjs` - Next.js

## Плагины

### Routing
- `react-router` (для React)
- `vue-router` (для Vue)

### State Management
- `redux-toolkit` (для React)
- `zustand` (для React)
- `pinia` (для Vue)

### Styling
- `tailwind` - Tailwind CSS
- `css-modules` - CSS Modules

## Структура

```
src/
  index.ts          # Express server
  builder.ts        # ProjectBuilder class
  types.ts          # TypeScript types
  helpers/          # Helper functions
    copy.ts         # File copying utility
    install.ts      # Package manager installation
  plugins/          # Plugin implementations
    index.ts        # Plugin loader
    react-router.ts
    redux-toolkit.ts
    tailwind.ts
    ...
```

## Примечания

- Шаблоны берутся из локальной директории `templates/` или из `node_modules/create-vite`
- Для Next.js требуется локальный шаблон
- Все зависимости устанавливаются через выбранный package manager


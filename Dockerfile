FROM node:20-alpine AS builder
WORKDIR /app

# Копируем package файлы
COPY package*.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем TypeScript
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Копируем собранные файлы
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Создаем директории для временных файлов
RUN mkdir -p /tmp/project-builds /tmp/project-archives

EXPOSE 3001

CMD ["npm", "start"]


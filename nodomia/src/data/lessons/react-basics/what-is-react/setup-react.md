# Настройка проекта React

Для создания React-приложения проще всего использовать инструмент Vite.

## 1. Установка Node.js

Убедитесь, что у вас установлен Node.js версии 18 или выше:
```bash
node --version
```

## 2. Создание проекта через Vite

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

## 3. Создание проекта через Next.js (альтернатива)

Next.js — это React-фреймворк для production-разработки с поддержкой серверного
рендеринга (SSR), статической генерации (SSG) и файловой маршрутизации.

```bash
npx create-next-app@latest my-app --typescript
cd my-app
```

### Структура Next.js-проекта

```
my-app/
├── app/
│   ├── layout.tsx        # Корневой layout
│   ├── page.tsx          # Главная страница
│   └── globals.css       # Глобальные стили
├── public/
├── package.json
├── tsconfig.json
└── next.config.ts        # Конфигурация Next.js
```

### Запуск Next.js

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`.

### Когда выбирать Vite, а когда Next.js?

| Критерий | Vite | Next.js |
|---|---|---|
| Тип приложения | SPA (Single Page Application) | Многостраничные приложения |
| Рендеринг | Клиентский (CSR) | Серверный (SSR) + SSG |
| Сложность настройки | Простая | Средняя |
| Экосистема | Минимальная | Роутинг, API, оптимизация |
| Для чего подходит | Изучение React, простые проекты | Production-приложения |

## 4. Структура проекта (Vite)

```
my-app/
├── src/
│   ├── App.tsx          # Главный компонент
│   ├── main.tsx         # Точка входа
│   └── index.css        # Глобальные стили
├── public/
├── package.json         # Зависимости и скрипты
├── tsconfig.json        # Настройки TypeScript
└── vite.config.ts       # Настройки Vite
```

## 5. Запуск проекта

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`.

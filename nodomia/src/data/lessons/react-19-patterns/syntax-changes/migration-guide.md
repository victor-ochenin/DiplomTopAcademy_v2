# React 19 Migration Guide

## Шаг 1: Обновление зависимостей

```bash
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19
```

## Шаг 2: Запуск codemod'ов

React 19 предоставляет набор автоматических миграций:

```bash
# Замена forwardRef
npx codemod react/19/remove-forward-ref --target .

# Новый синтаксис контекста
npx codemod react/19/remove-context-provider --target .

# Другие codemod'ы: https://github.com/reactjs/react-codemod
```

## Шаг 3: Проверка совместимости библиотек

| Библиотека | Статус |
|------------|--------|
| React Router 7+ | ✅ |
| Next.js 15+ | ✅ |
| Material UI 6+ | ✅ |
| React Hook Form 8+ | ✅ |
| React Query 5+ | ✅ |

## Шаг 4: Замена устаревших API

| Устарело | Замена |
|----------|--------|
| `forwardRef` | `ref` как проп |
| `<Context.Provider>` | `<Context>` |
| `PropTypes` | TypeScript |
| `defaultProps` | Параметры по умолчанию в деструктуризации |

## Шаг 5: Тестирование

```bash
npm test              # unit-тесты
npm run build         # сборка без ошибок
npx react-compiler    # проверка совместимости
```

## Основные ошибки при миграции

- **ref не работает** — замените `forwardRef` на `ref` как проп
- **Context.Provider не найден** — используйте `<Context value={...}>`
- **TypeError: Cannot read properties of undefined** — замените `defaultProps` на значения по умолчанию

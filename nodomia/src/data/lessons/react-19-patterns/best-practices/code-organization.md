# Code Organization

## Структура папок

```
src/
├── components/         # переиспользуемые UI-компоненты
│   ├── Button/
│   ├── Modal/
│   └── Select/
├── features/           # функциональные модули
│   ├── auth/
│   ├── todos/
│   └── profile/
├── hooks/              # общие хуки
├── utils/              # утилиты
└── types/              # общие типы
```

## Feature-based структура

```tsx
features/
└── todos/
    ├── components/     # компоненты тодосов
    ├── hooks/          # хуки для тодосов
    ├── types.ts        # типы
    └── index.ts        # публичный API модуля
```

## Правила организации

1. **Один компонент — один файл**
2. **Публичный API модуля — через index.ts**
3. **Общее — в shared, специфичное — в feature**

## Именование

| Элемент       | Стиль                  | Пример                 |
| ------------- | ---------------------- | ---------------------- |
| Компонент     | PascalCase             | `UserCard.tsx`         |
| Хук           | camelCase, use-префикс | `useAuth.ts`           |
| Утилита       | camelCase              | `formatDate.ts`        |
| Тип/интерфейс | PascalCase             | `User.ts`              |
| CSS-модуль    | kebab-case             | `user-card.module.css` |

# Functional Components

В современном React все компоненты — это функции JavaScript.

## Определение компонента

Компонент — это функция, которая возвращает React-элемент (JSX):

```tsx
function Greeting() {
  return <h1>Привет, мир!</h1>
}
```

## Имена с большой буквы

React требует, чтобы имена компонентов начинались с заглавной буквы. Это отличает их от обычных HTML-тегов:

```tsx
// ✅ Компонент
function MyButton() {
  return <button>Кликни меня</button>
}

// ❌ Не сработает — React подумает, что это HTML-тег
function myButton() {
  return <button>Кликни меня</button>
}
```

## Экспорт и импорт

Компоненты можно определять в отдельных файлах и переиспользовать:

```tsx
// Greeting.tsx
export default function Greeting() {
  return <h1>Привет!</h1>
}

// App.tsx
import Greeting from './Greeting'
```

## Возвращаемое значение

Компонент всегда возвращает один корневой элемент (или Fragment):

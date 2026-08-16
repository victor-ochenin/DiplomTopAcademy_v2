# Основы JSX

JSX (JavaScript XML) — это синтаксическое расширение JavaScript, которое позволяет
писать HTML-подобный код прямо в JavaScript-файлах.

## Почему JSX?

React использует JSX, потому что он:

- Даёт интуитивно понятный синтаксис для описания UI
- Использует всю мощь JavaScript (переменные, функции, условия)
- Предотвращает XSS-атаки (экранирует значения)

## Правила JSX

### 1. Один корневой элемент

```tsx
// ❌ Ошибка: два корневых элемента
return (
  <h1>Заголовок</h1>
  <p>Текст</p>
)

// ✅ Правильно: обёрнуто во Fragment
return (
  <>
    <h1>Заголовок</h1>
    <p>Текст</p>
  </>
)
```

### 2. Закрывающие теги

```tsx
<br />     // Самозакрывающийся тег
<input />  // Всегда закрывайте
```

### 3. Атрибуты в camelCase

```tsx
<div className="container">   // class → className
  <label htmlFor="name">Имя</label>  // for → htmlFor
  <button onClick={handleClick}>Клик</button>  // onclick → onClick
</div>
```

### 4. JavaScript-выражения в `{}`

```tsx
const name = 'Иван'
const element = <h1>Привет, {name}!</h1>
```

В фигурных скобках можно использовать любое JavaScript-выражение:
```tsx
<p>{2 + 2}</p>
<p>{user.name.toUpperCase()}</p>
<img src={imageUrl} alt={description} />
```

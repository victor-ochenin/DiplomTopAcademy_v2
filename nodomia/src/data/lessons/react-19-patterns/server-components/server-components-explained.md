# Server Components Explained

Серверные компоненты (RSC) — компоненты, которые выполняются **исключительно на сервере**. Они не отправляют JavaScript в браузер.

## Ключевые особенности

- **Нулевой bundle**: код серверного компонента никогда не попадает к клиенту
- **Прямой доступ к ресурсам**: база данных, файловая система, API-ключи
- **Автоматический streaming**: сервер отправляет результат по мере готовности

## До React 19

В React 18 серверные компоненты были экспериментальной фичей, доступной только через фреймворки (Next.js). В React 19 они стали полноценной частью React.

## Пример

```tsx
// ServerComponent.server.js — выполняется на сервере
import db from './database';

async function Posts() {
  const posts = await db.query('SELECT * FROM posts ORDER BY created_at DESC');

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content.slice(0, 100)}...</p>
        </li>
      ))}
    </ul>
  );
}
```

## Что НЕ могут серверные компоненты

- Использовать хуки (`useState`, `useEffect`, `useContext`)
- Использовать браузерные API
- Обрабатывать события (`onClick`, `onSubmit`)
- Использовать кастомные хуки, которые зависят от состояния

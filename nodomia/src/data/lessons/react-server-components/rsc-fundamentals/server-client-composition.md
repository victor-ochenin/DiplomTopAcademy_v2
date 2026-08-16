# Композиция сервера и клиента

Правильная композиция серверных и клиентских компонентов — ключ к производительному React-приложению.

## Правила границы

1. **Серверный → Клиентский** — можно (но не наоборот)
2. **Клиентский → Серверный через children** — единственный способ
3. **Серверный внутри клиентского через children** — серверный контент подготавливается заранее

## Паттерн: children как мост

```tsx
// ClientWrapper.client.tsx
'use client';
function ClientWrapper({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(true);
  return <div>{show && children}</div>;
}

// Page.server.tsx
import { ClientWrapper } from './ClientWrapper';
import { ServerWidget } from './ServerWidget';

function Page() {
  return (
    <ClientWrapper>
      <ServerWidget /> {/* выполняется на сервере до передачи */}
    </ClientWrapper>
  );
}
```

## Паттерн: серверная подготовка + клиентская интерактивность

```tsx
// Page.server.tsx
async function Page() {
  const posts = await db.query('SELECT * FROM posts');
  return <InteractiveList initialPosts={posts} />;
}

// InteractiveList.client.tsx
function InteractiveList({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts);
  const [sortBy, setSortBy] = useState('date');
  // сортировка, фильтрация — на клиенте
}
```

## Когда что использовать

| Задача                    | Компонент  |
| ------------------------- | ---------- |
| Загрузка данных из БД     | Серверный  |
| Обработка кликов          | Клиентский |
| Рендеринг больших списков | Серверный  |
| Анимации                  | Клиентский |
| SEO-контент               | Серверный  |

# Асинхронные серверные компоненты

Серверные компоненты могут быть асинхронными — это их ключевое преимущество. Они позволяют загружать данные напрямую, без `useEffect` или сторонних библиотек.

## Синтаксис

```tsx
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const posts = await db.query('SELECT * FROM posts WHERE author_id = $1', [
    userId,
  ]);

  return (
    <div>
      <h1>{user.name}</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Интеграция с Suspense

Асинхронные компоненты автоматически приостанавливаются (suspend) во время загрузки:

```tsx
function Page() {
  return (
    <Suspense fallback={<p>Загрузка профиля...</p>}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

## Последовательная vs параллельная загрузка

```tsx
// ❌ Последовательная — медленнее
async function Profile(userId: string) {
  const user = await fetchUser(userId); // ждём
  const posts = await fetchPosts(userId); // потом ещё ждём
}

// ✅ Параллельная — быстрее
async function Profile(userId: string) {
  const [user, posts] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
  ]);
}
```

## Преимущества перед подходом с useEffect

|                          | Асинхронный RSC         | useEffect + useState   |
| ------------------------ | ----------------------- | ---------------------- |
| Водопад запросов         | Нет (рендер на сервере) | Есть (клиент)          |
| Состояние загрузки       | Suspense автоматически  | Ручное управление      |
| Данные к моменту рендера | ✅ Да                   | ❌ Нет                 |
| SEO                      | ✅ Полный HTML          | ❌ Пустой HTML сначала |

# Функция cache()

`cache()` — функция для кэширования результатов асинхронных операций в рамках одного серверного запроса.

## Синтаксис

```tsx
import { cache } from 'react'

const fetchUser = cache(async (id: string) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return user
})
```

## Зачем нужна

При рендеринге серверного компонента одна и та же функция может быть вызвана несколько раз — из разных компонентов. `cache()` гарантирует, что запрос выполнится **только один раз**.

```tsx
const getUser = cache(async (id: string) => {
  console.log('DB query executed') // выполнится 1 раз
  return db.query('SELECT * FROM users WHERE id = $1', [id])
})

// Оба компонента вызывают getUser('123'), но запрос в БД — один
async function Header({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <header>{user.name}</header>
}

async function Profile({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <div>{user.bio}</div>
}
```

## Область видимости

Кэш живёт **в рамках одного HTTP-запроса**. После завершения рендеринга страницы кэш очищается. Данные не сохраняются между разными запросами пользователей.

## cache() vs useMemo

| | cache() | useMemo |
|---|---|---|
| Где работает | Серверные компоненты | Клиентские компоненты |
| Область | Запрос пользователя | Компонент |
| Асинхронность | ✅ Да | ❌ Нет |
| Зависимости | Аргументы функции | Массив зависимостей |

## Пример: дедупликация fetch

```tsx
const fetchPost = cache(async (id: string) => {
  const res = await fetch(`https://api.example.com/posts/${id}`)
  return res.json()
})
```

Используйте `cache()` для всех функций, которые могут быть вызваны более одного раза за рендер.

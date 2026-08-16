# useEffect Basics

`useEffect` — хук для выполнения побочных эффектов в функциональных компонентах.

## Синтаксис

```tsx
useEffect(() => {
  // побочный эффект
}, [dependencies])
```

## Что можно делать в useEffect?

- Запросы к API (fetch)
- Подписки на события
- Работа с таймерами (setTimeout, setInterval)
- Работа с DOM напрямую

## Пример с загрузкой данных

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data))
  }, [userId])

  if (!user) return <p>Загрузка...</p>
  return <p>{user.name}</p>
}
```

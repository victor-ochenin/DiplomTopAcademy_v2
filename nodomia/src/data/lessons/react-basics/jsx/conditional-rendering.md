# Условный рендеринг

В React можно рендерить разные части UI в зависимости от состояния.

## 1. Тернарный оператор

```tsx
function Greeting({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div>
      {isLoggedIn ? <h1>Добро пожаловать!</h1> : <h1>Войдите в систему</h1>}
    </div>
  )
}
```

## 2. Оператор `&&`

```tsx
function Notification({ message }: { message?: string }) {
  return (
    <div>
      {message && <p className="alert">{message}</p>}
    </div>
  )
}
```

Если `message` — `undefined` или `null`, React не рендерит ничего.
Важно: не используйте `&&` с числами — `0 && ...` вернёт `0`.

## 3. if/else

```tsx
function Status({ code }: { code: 'loading' | 'error' | 'success' }) {
  if (code === 'loading') return <Spinner />
  if (code === 'error') return <ErrorMessage />
  return <SuccessMessage />
}
```

## 4. Switch / несколько условий

```tsx
function getStatusText(status: string) {
  switch (status) {
    case 'active': return 'Активен'
    case 'blocked': return 'Заблокирован'
    case 'pending': return 'Ожидает'
    default: return 'Неизвестно'
  }
}
```

# Server Function Security

Server Functions открывают доступ к серверному коду из браузера — это требует внимания к безопасности.

## 1. Аутентификация и авторизация

Каждая Server Function должна проверять права доступа:

```tsx
'use server'

import { getUser } from './auth'

export async function deletePost(postId: number) {
  const user = await getUser()
  if (!user || !user.isAdmin) {
    throw new Error('Доступ запрещён')
  }

  await db.query('DELETE FROM posts WHERE id = $1', [postId])
}
```

## 2. Валидация входных данных

Никогда не доверяйте данным, пришедшим с клиента:

```tsx
'use server'

export async function updateProfile(prev: unknown, formData: FormData) {
  const name = formData.get('name')
  if (typeof name !== 'string' || name.length > 100) {
    return { error: 'Некорректное имя' }
  }

  const userId = await getCurrentUserId()
  await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId])
}
```

## 3. Защита от CSRF

React 19 автоматически генерирует и проверяет CSRF-токены для Server Functions, вызванных через `<form action={...}>`. Дополнительных действий не требуется.

## 4. Rate Limiting

Серверные функции доступны по HTTP — их можно вызывать многократно. Добавляйте ограничения:

```tsx
'use server'

const rateLimit = new Map<string, number>()

export async function sendMessage(formData: FormData) {
  const ip = await getClientIp()
  const now = Date.now()
  const last = rateLimit.get(ip) ?? 0

  if (now - last < 1000) {
    throw new Error('Слишком много запросов')
  }

  rateLimit.set(ip, now)
  // ... обработка сообщения
}
```

## Правила безопасности

| Правило | Описание |
|---------|----------|
| Всегда проверяй авторизацию | Каждая функция должна знать, кто её вызвал |
| Валидируй входные данные | Типы, длина, формат — проверяй всё |
| Не раскрывай чувствительные данные | Server Function может вернуть только то, что нужно клиенту |
| Ограничивай частоту вызовов | Rate limiting для публичных мутаций |

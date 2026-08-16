# Безопасность Server Actions

Server Actions — это публичные API-эндпоинты. К ним нужно относиться с тем же уровнем осторожности, что и к REST/GraphQL API.

## 1. Валидация на сервере

Никогда не доверяйте данным, пришедшим с клиента:

```tsx
'use server'

import { z } from 'zod'

const postSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
})

export async function updatePost(formData: FormData) {
  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  await db.query(
    'UPDATE posts SET title = $1, content = $2 WHERE id = $3',
    [parsed.data.title, parsed.data.content, formData.get('postId')]
  )

  revalidatePath('/posts')
}
```

## 2. Авторизация

Проверяйте права пользователя перед выполнением action:

```tsx
'use server'

import { getCurrentUser } from '@/auth'

export async function deletePost(postId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Не авторизован')

  const post = await db.query('SELECT author_id FROM posts WHERE id = $1', [postId])
  if (post.author_id !== user.id) throw new Error('Нет прав')

  await db.query('DELETE FROM posts WHERE id = $1', [postId])
  revalidatePath('/posts')
}
```

## 3. CSRF-защита

React автоматически генерирует CSRF-токены для Server Actions. При отправке формы с `action` токен проверяется на сервере. Отключать эту защиту **не рекомендуется**.

## 4. Rate Limiting

```tsx
'use server'

import { rateLimit } from '@/lib/rate-limit'

export async function createComment(formData: FormData) {
  const ip = headers().get('x-forwarded-for')
  const { success } = await rateLimit(ip as string)

  if (!success) {
    return { error: 'Слишком много запросов' }
  }

  // обработка комментария...
}
```

## 5. Проверка типов

TypeScript не проверяет данные во время выполнения — используйте схемы (Zod, Yup) для runtime-валидации:

```tsx
const input = formData.get('age')
// formData.get всегда возвращает string | null
const age = Number(input)
if (isNaN(age)) return { error: 'Некорректный возраст' }
```

## Чеклист

- [ ] Валидация всех входных данных
- [ ] Проверка аутентификации
- [ ] Проверка авторизации (прав доступа)
- [ ] Rate limiting для публичных action
- [ ] Логирование ошибок (без раскрытия чувствительных данных)

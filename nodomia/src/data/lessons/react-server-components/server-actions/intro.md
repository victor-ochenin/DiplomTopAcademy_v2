# Введение в Server Actions

Server Actions — функции, которые выполняются на сервере, но вызываются с клиента. Они позволяют отправлять данные и мутировать состояние без написания API-эндпоинтов.

## Синтаксис

```tsx
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')

  await db.query(
    'INSERT INTO posts (title, content) VALUES ($1, $2)',
    [title, content]
  )

  revalidatePath('/posts')
}
```

## Использование в форме

```tsx
import { createPost } from './actions'

function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Создать</button>
    </form>
  )
}
```

## Инлайн-определение

Action можно определить прямо внутри компонента или рядом:

```tsx
function LikeButton({ postId }: { postId: string }) {
  async function likePost() {
    'use server'
    await incrementLikes(postId)
    revalidatePath(`/posts/${postId}`)
  }

  return <form action={likePost}>
    <button type="submit">❤️</button>
  </form>
}
```

## useActionState

Хук `useActionState` позволяет читать состояние/ошибки после выполнения action:

```tsx
'use client'

import { createPost } from './actions'
import { useActionState } from 'react'

function Form() {
  const [state, action, isPending] = useActionState(createPost, null)

  return (
    <form action={action}>
      <input name="title" />
      {state?.error && <p className="error">{state.error}</p>}
      <button disabled={isPending}>
        {isPending ? 'Сохранение...' : 'Создать'}
      </button>
    </form>
  )
}
```

## Когда использовать Server Actions

- Создание/редактирование записей
- Отправка форм
- Интерактивные кнопки (лайки, удаление)
- Любая мутация данных, которая не требует сложной клиентской логики

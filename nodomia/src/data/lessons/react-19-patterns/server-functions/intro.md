# Server Functions (Server Actions)

Server Functions — функции, которые выполняются **на сервере**, но вызываются **с клиента**. React 19 автоматически генерирует API-эндпоинт для каждой такой функции.

## Директива 'use server'

```tsx
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  await db.query('INSERT INTO posts (title) VALUES ($1)', [title])
}
```

## Способы использования

### В серверном компоненте — передача action в форму:

```tsx
import { createPost } from './actions'

function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">Создать</button>
    </form>
  )
}
```

### В клиентском компоненте — инлайн-функция:

```tsx
'use client'

function NewPostForm() {
  const createPost = async (formData: FormData) => {
    'use server'
    await db.query('INSERT INTO posts (title) VALUES ($1)', formData.get('title'))
  }

  return <form action={createPost}>{/* ... */}</form>
}
```

## Что происходит под капотом

1. React собирает аргументы функции на клиенте
2. Отправляет POST-запрос на серверный эндпоинт
3. Сервер выполняет функцию
4. Результат возвращается клиенту

## Возвращаемое значение

```tsx
'use server'

export async function addTodo(prev: Todo[], formData: FormData): Promise<Todo[]> {
  const text = formData.get('text') as string
  await db.query('INSERT INTO todos (text) VALUES ($1)', [text])
  return [...prev, { id: Date.now(), text, done: false }]
}

// использование с useActionState
const [todos, formAction] = useActionState(addTodo, [])
```

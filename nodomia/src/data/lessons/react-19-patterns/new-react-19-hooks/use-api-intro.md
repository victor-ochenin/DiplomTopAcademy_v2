# The use API

Хук `use` — новый API в React 19, который может читать данные из **Promise** и **Context** без условных правил обычных хуков.

## Синтаксис

```tsx
const value = use(resource)
```

- `resource` — Promise или React Context
- Возвращает значение промиса или значение контекста

## Чтение Promise

```tsx
import { use } from 'react'

async function fetchComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/comments/${postId}`)
  return res.json()
}

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise)
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>
}
```

## Чтение Context

```tsx
import { use } from 'react'
import { ThemeContext } from './ThemeContext'

function ThemedButton() {
  const theme = use(ThemeContext)
  return <button className={`btn-${theme}`}>Нажми меня</button>
}
```

## Ключевое отличие: use можно вызывать в условиях и циклах

В отличие от `useState`, `useEffect` и других хуков, `use` **не подчиняется правилу «только на верхнем уровне»**:

```tsx
function Card({ promoPromise }: { promoPromise?: Promise<string> }) {
  // ✅ можно внутри условия
  const promo = promoPromise ? use(promoPromise) : null
  return <div>{promo}</div>
}
```

## use vs useContext

| | `use(Context)` | `useContext(Context)` |
|---|---|---|
| Условный вызов | ✅ да | ❌ нет |
| Чтение Promise | ✅ да | ❌ нет |
| Ограничение | только render | только render |

## Интеграция с Suspense

`use(promise)` автоматически приостанавливает компонент, если промис ещё не разрешён — работает с Suspense:

```tsx
function Page() {
  const commentsPromise = fetchComments(postId)
  return (
    <Suspense fallback={<p>Загрузка комментариев...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  )
}
```

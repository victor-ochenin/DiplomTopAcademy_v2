# Обработка форм с Actions

Server Actions интегрируются напрямую с HTML-формами, предоставляя богатый UX с минимальным кодом.

## Базовая форма

```tsx
// actions.ts
'use server'

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return { error: 'Заполните все поля' }
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return { error: 'Email уже используется' }
  }

  await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
    [email, hashPassword(password)]
  )

  redirect('/dashboard')
}

// form.tsx
'use client'

function SignupForm() {
  const [state, action, isPending] = useActionState(signup, null)

  return (
    <form action={action}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <p className="error">{state.error}</p>}
      <button disabled={isPending}>
        {isPending ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}
```

## useFormStatus

Хук `useFormStatus()` даёт доступ к состоянию формы из дочернего компонента:

```tsx
'use client'

function SubmitButton() {
  const { pending, data } = useFormStatus()
  // data — FormData, которая отправляется

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Отправка...' : 'Отправить'}
    </button>
  )
}

function Form() {
  return (
    <form action={action}>
      <input name="title" required />
      <SubmitButton />
    </form>
  )
}
```

## Прогрессивное улучшение

Формы с Server Actions **работают без JavaScript**. React автоматически создаёт нативный action-URL, и форма отправляется обычным POST-запросом, если JS не загружен.

```tsx
// Эта форма работает даже при выключенном JS
function SearchForm() {
  async function search(formData: FormData) {
    'use server'
    const q = formData.get('q')
    redirect(`/search?q=${q}`)
  }

  return <form action={search}>
    <input name="q" />
    <button type="submit">Найти</button>
  </form>
}
```

# Понимание Actions в React 19

React 19 вводит концепцию **Actions** — новый способ обработки асинхронных переходов и отправки форм. Actions строятся поверх `useTransition` и позволяют React автоматически управлять состоянием загрузки, ошибками и optimistic updates.

## Что такое Action?

Action — это асинхронная функция, которая передаётся в пропсы, связанные с переходами или формами:

```tsx
async function submitAction(formData: FormData) {
  await saveToDatabase(formData)
}
```

React 19 добавляет поддержку Actions в:

- `<form action={...}>` — отправка формы через action
- `<button formAction={...}>` — действие конкретной кнопки
- `useTransition()` — обёртка для асинхронных обновлений состояния

## Пример: форма с Action

```tsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Сохранение...' : 'Сохранить'}
    </button>
  )
}

function MyForm() {
  const [error, submitAction] = useActionState(updateProfile, null)

  return (
    <form action={submitAction}>
      <input name="name" required />
      {error && <p className="error">{error}</p>}
      <SubmitButton />
    </form>
  )
}
```

## Ключевые особенности

- **Pending state**: React автоматически отслеживает, выполняется ли action, и предоставляет флаг `pending`
- **Обработка ошибок**: можно обрабатывать ошибки внутри action и возвращать их в UI
- **Optimistic updates**: возможность показать результат до завершения запроса

## Сравнение с подходом до React 19

| Задача | До React 19 | React 19 |
|---|---|---|
| Отправка формы | `onSubmit` + ручное управление `loading` | `<form action={action}>` + автоматический `pending` |
| Обработка ошибок | `useState` для ошибок | `useActionState` для состояния формы |
| Асинхронная логика | `useEffect` для побочных эффектов | Action как единое место для асинхронной логики |

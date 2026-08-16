# Хук useActionState

`useActionState` — новый хук в React 19, который заменяет `useFormState` (который был доступен в React Canary). Он позволяет управлять состоянием формы на основе результата выполнения action.

## Сигнатура

```tsx
const [state, formAction, isPending] = useActionState(action, initialState)
```

| Параметр | Тип | Описание |
|---|---|---|
| `action` | `(prevState, formData) => Promise<state>` | Асинхронная функция, принимает предыдущее состояние и данные формы |
| `initialState` | `state` | Начальное значение состояния |
| `state` | `state` | Текущее состояние (результат последнего выполнения action) |
| `formAction` | `(formData) => void` | Обёрнутая функция для передачи в `action` пропс формы |
| `isPending` | `boolean` | Флаг, `true` на время выполнения action |

## Пример: форма добавления задачи

```tsx
interface TaskState {
  status: 'idle' | 'success' | 'error'
  message: string
}

async function addTask(prevState: TaskState, formData: FormData): Promise<TaskState> {
  const title = formData.get('title')

  if (!title) {
    return { status: 'error', message: 'Название задачи обязательно' }
  }

  try {
    await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    return { status: 'success', message: 'Задача добавлена' }
  } catch {
    return { status: 'error', message: 'Ошибка при добавлении задачи' }
  }
}

function AddTaskForm() {
  const [state, formAction, isPending] = useActionState(addTask, {
    status: 'idle',
    message: '',
  })

  return (
    <form action={formAction}>
      <input name="title" type="text" placeholder="Новая задача" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Добавление...' : 'Добавить'}
      </button>

      {state.status === 'success' && (
        <p style={{ color: 'green' }}>{state.message}</p>
      )}
      {state.status === 'error' && (
        <p style={{ color: 'red' }}>{state.message}</p>
      )}
    </form>
  )
}
```

## Важные моменты

- Хук доступен только в React 19 и выше
- `formAction` автоматически оборачивает action в `startTransition`
- `isPending` становится `true` на время выполнения action
- Предыдущее состояние передаётся первым аргументом — это позволяет выстраивать цепочки обновлений

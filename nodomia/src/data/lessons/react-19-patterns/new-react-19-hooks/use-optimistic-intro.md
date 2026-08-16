# useOptimistic for Instant UI Updates

Хук `useOptimistic` позволяет показать пользователю результат операции **до того, как она завершится** на сервере. Это создаёт ощущение мгновенного отклика.

## Синтаксис

```tsx
const [optimisticState, addOptimistic] = useOptimistic(state, updateFn);
```

- `state` — текущее реальное состояние
- `updateFn(currentState, optimisticValue)` — функция, которая возвращает оптимистичную версию состояния
- `optimisticState` — состояние, которое будет показываться во время выполнения действия
- `addOptimistic(value)` — вызов начала оптимистичного обновления

## Пример

```tsx
import { useOptimistic, useActionState } from 'react';

interface Message {
  text: string;
  sending?: boolean;
}

async function sendMessage(
  prev: Message[] | null,
  formData: FormData,
): Promise<Message[]> {
  const text = formData.get('message') as string;
  await new Promise((r) => setTimeout(r, 1000));
  return [...(prev ?? []), { text }];
}

function Thread() {
  const [messages, formAction] = useActionState(sendMessage, null);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages ?? [],
    (state, optimisticText: string) => [
      ...state,
      { text: optimisticText, sending: true },
    ],
  );

  async function handleSubmit(formData: FormData) {
    addOptimisticMessage(formData.get('message'));
    await formAction(formData);
  }

  return (
    <form action={handleSubmit}>
      <ul>
        {optimisticMessages.map((msg, i) => (
          <li key={i} style={{ opacity: msg.sending ? 0.5 : 1 }}>
            {msg.text} {msg.sending && '⏳'}
          </li>
        ))}
      </ul>
      <input name="message" required />
      <button type="submit">Отправить</button>
    </form>
  );
}
```

## Когда использовать

- Отправка сообщений в чате
- Лайки / реакции
- Добавление элементов в список
- Любой сценарий, где успех операции практически гарантирован

# useFormStatus for Nested Components

Хук `useFormStatus` даёт дочерним компонентам доступ к статусу родительской формы без передачи пропсов через всю иерархию.

## Синтаксис

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <button disabled={pending}>{pending ? 'Отправка...' : 'Отправить'}</button>
  );
}
```

## Возвращаемые значения

| Поле      | Тип      | Описание                            |
| --------- | -------- | ----------------------------------- |
| `pending` | boolean  | true, если форма отправляется       |
| `data`    | FormData | данные, которые отправляются        |
| `method`  | string   | GET или POST                        |
| `action`  | function | ссылка на переданную функцию action |

## Важное ограничение

Компонент, вызывающий `useFormStatus`, **обязательно должен быть вложен в элемент `<form>`**:

```tsx
// ✅ правильно
function Form() {
  return (
    <form action={submitAction}>
      <SubmitButton />
    </form>
  );
}

// ❌ не сработает — SubmitButton не внутри form
function Form() {
  return <SubmitButton />;
}
```

## Пример с useActionState

```tsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

async function updateName(_prev: string | null, formData: FormData) {
  const name = formData.get('name') as string;
  await new Promise((r) => setTimeout(r, 1500));
  return name;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Сохранение...' : 'Сохранить'}
    </button>
  );
}

function ProfileForm() {
  const [name, formAction] = useActionState(updateName, null);
  return (
    <form action={formAction}>
      <input name="name" defaultValue={name ?? ''} />
      <SubmitButton />
      {name && <p>Имя обновлено: {name}</p>}
    </form>
  );
}
```

`useFormStatus` делает код чище — не нужно пробрасывать `isPending` через пропсы.

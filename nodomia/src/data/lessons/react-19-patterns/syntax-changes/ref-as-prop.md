# ref as a Regular Prop

В React 19 `ref` стал обычным пропом — `forwardRef` больше не нужен.

## До React 19

```tsx
import { forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

## React 19

```tsx
function Input(props: Props) {
  // ref доступен как props.ref
  return <input ref={props.ref} {...props} />;
}

// или через деструктуризацию:
function Input({ ref, ...props }: Props) {
  return <input ref={ref} {...props} />;
}
```

## Автомиграция

React 19 предоставляет codemod, который автоматически заменяет `forwardRef` на новую нотацию:

```bash
npx codemod react/19/remove-forward-ref --target .
```

## Почему это важно

- Меньше кода — не нужно оборачивать каждый компонент
- Проще типизация — `ref` объявляется как обычный проп
- Обратная совместимость — `forwardRef` пока не удалён, но объявлен устаревшим

## Когда forwardRef всё ещё нужен

Если вы используете React 18 или ниже — `forwardRef` остаётся единственным способом. После миграции на 19 его можно удалять постепенно.

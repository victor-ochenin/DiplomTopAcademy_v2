# Обзор React Compiler

React Compiler (бывший React Forget) — компилятор от Meta, который **автоматически мемоизирует** компоненты и хуки. Он избавляет от ручного использования `useMemo`, `useCallback` и `React.memo`.

## Как работает

Компилятор анализирует JavaScript/TypeScript код и добавляет мемоизацию туда, где это безопасно. Разработчику не нужно думать о `useMemo` — компилятор делает это за него.

```tsx
// Исходный код
function Profile({ user, bio }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{bio}</p>
    </div>
  );
}

// После компиляции (упрощённо)
function Profile($) {
  const t0 = $.memo(() => user.name);
  const t1 = $.memo(() => bio);
  return $.jsx('div', null, $.jsx('h1', null, t0), $.jsx('p', null, t1));
}
```

## Не нужно писать

```tsx
// ❌ Всё это становится не нужно
const memoizedValue = useMemo(() => expensive(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a), [a]);
const MemoizedComponent = React.memo(Component);
```

## Настройка

```json
// babel.config.js
{
  "plugins": ["babel-plugin-react-compiler"]
}
```

## Состояние

React Compiler находится в активной разработке. Он уже используется в продакшене Meta на Instagram и части сайтов.

## Когда использовать

- Все новые React-проекты (особенно с RSC)
- Проекты с частыми ререндерами
- Команды, не желающие вручную проставлять useMemo/useCallback

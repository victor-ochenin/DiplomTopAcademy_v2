# Higher-Order Components

HOC — функция, которая принимает компонент и возвращает новый компонент с расширенным функционалом.

## Базовый пример

```tsx
function withLogger<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    useEffect(() => {
      console.log(`${Component.displayName || Component.name} mounted`);
      return () =>
        console.log(`${Component.displayName || Component.name} unmounted`);
    }, []);

    return <Component {...props} />;
  };
}

const UserProfileWithLogging = withLogger(UserProfile);
```

## Когда HOC всё ещё полезен

### 1. Сквозная функциональность

```tsx
const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return function AuthenticatedComponent(props: P) {
    const user = useUser();
    if (!user) return <Redirect to="/login" />;
    return <Component {...props} user={user} />;
  };
};
```

### 2. Мемоизация пропсов

```tsx
const withMemo = <P extends object>(Component: React.ComponentType<P>) => {
  return React.memo(Component);
};
```

## HOC vs Render Props vs Hooks

| Паттерн      | Случай                                                           |
| ------------ | ---------------------------------------------------------------- |
| HOC          | Сквозная функциональность (логирование, авторизация, мемоизация) |
| Render Props | Гибкий контроль рендеринга (анимация, трекинг мыши)              |
| Custom Hooks | Логика без влияния на рендеринг (состояние, эффекты, подписки)   |

## Рекомендация

Для большинства случаев предпочитайте **custom hooks**. HOC используйте только когда нужно вмешаться в рендеринг компонента (обёртка, провайдер, мемоизация).

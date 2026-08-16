# Functional Updates (Avoid Stale State)

## Проблема stale state

Если вызвать `setState` несколько раз подряд, каждый вызов использует одно и то же значение:

```tsx
const [count, setCount] = useState(0)

setCount(count + 1) // 0 + 1 = 1
setCount(count + 1) // 0 + 1 = 1 (снова!)
setCount(count + 1) // 0 + 1 = 1
```

## Решение — functional update

Передавайте функцию, которая получает предыдущее состояние:

```tsx
setCount(prev => prev + 1) // 0 + 1 = 1
setCount(prev => prev + 1) // 1 + 1 = 2
setCount(prev => prev + 1) // 2 + 1 = 3
```

## Когда это нужно?

- При множественных вызовах в одном обработчике
- При обновлении состояния внутри `useEffect` или `setTimeout`
- Всегда, когда новое значение зависит от предыдущего

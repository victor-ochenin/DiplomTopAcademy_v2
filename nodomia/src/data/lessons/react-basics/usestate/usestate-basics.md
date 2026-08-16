# useState Basics

`useState` — это хук, который добавляет состояние в функциональный компонент.

## Синтаксис

```tsx
const [state, setState] = useState(initialValue)
```

- `state` — текущее значение
- `setState` — функция для обновления
- `initialValue` — начальное значение (используется только при первом рендере)

## Пример счётчика

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Счёт: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  )
}
```

## Множественное состояние

Можно использовать несколько вызовов useState:

```tsx
const [name, setName] = useState('')
const [age, setAge] = useState(0)
const [isActive, setIsActive] = useState(false)
```

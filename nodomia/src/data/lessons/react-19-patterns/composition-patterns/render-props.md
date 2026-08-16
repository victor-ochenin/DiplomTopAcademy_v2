# Render Props Pattern

Render Props — паттерн, где компонент получает функцию в качестве пропа и вызывает её для определения того, что рендерить.

## Базовый пример

```tsx
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  return (
    <div onMouseMove={e => setPosition({ x: e.clientX, y: e.clientY })}>
      {render(position)}
    </div>
  )
}

// Использование
function App() {
  return (
    <MouseTracker
      render={({ x, y }) => (
        <p>Мышь: {x}, {y}</p>
      )}
    />
  )
}
```

## Сравнение с HOC

| | Render Props | HOC |
|---|---|---|
| Гибкость | Высокая — контролируете что рендерить | Низкая — HOC решает |
| Конфликт имён | Нет | Возможен |
| Tree-shaking | Да | Зависит от реализации |
| Вложенность | Явная в JSX | Скрытая |

## Современная альтернатива — children как функция

```tsx
function DataFetcher({ url, children }: {
  url: string
  children: (data: unknown) => React.ReactNode
}) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData)
  }, [url])
  return data ? children(data) : <p>Загрузка...</p>
}
```

Render Props остаётся актуальным для библиотек, которым нужна максимальная гибкость рендеринга.

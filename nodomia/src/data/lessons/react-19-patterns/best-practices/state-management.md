# State Management Patterns

## Локальное состояние — useState

Для состояния, которое не нужно за пределами компонента:

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

## Подъём состояния — Lifting State Up

Когда состояние нужно нескольким дочерним компонентам:

```tsx
function Parent() {
  const [value, setValue] = useState('')
  return (
    <div>
      <Input value={value} onChange={setValue} />
      <Preview text={value} />
    </div>
  )
}
```

## Контекст — Context

Когда состояние нужно глубоко в дереве:

```tsx
const ThemeContext = createContext('light')
const ThemeContext = createContext('light')

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <DeepTree />
    </ThemeContext.Provider>
  )
}

## Композиция вместо контекста

Иногда можно избежать контекста, передав компонент через children:

```tsx
// ❌ Контекст для простого проброса
function Layout({ children }) {
  const [sidebar, setSidebar] = useState(true)
  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  )
}

// ✅ Композиция
function Layout({ sidebar, children }) {
  return (
    <div>
      {sidebar}
      {children}
    </div>
  )
}
```

## Когда что использовать

| Уровень | Инструмент | Когда |
|---------|-----------|-------|
| Компонент | `useState` | Изолированное состояние |
| Группа | Lifting State Up | 2-3 соседних компонента |
| Ветка | Context | Глубокое дерево, редкие изменения |
| Приложение | Zustand / Redux | Сложная логика, много подписчиков |

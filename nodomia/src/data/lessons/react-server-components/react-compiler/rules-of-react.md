# Правила React

React Compiler полагается на **Правила React** — набор гарантий, которые позволяют компилятору безопасно мемоизировать код.

## 1. Компоненты и хуки — чистые функции

```tsx
// ✅ Чисто
function Welcome({ name }: { name: string }) {
  return <h1>Привет, {name}</h1>
}

// ❌ Нечисто — мутация внешней переменной
let count = 0
function BadCounter() {
  count++
  return <p>{count}</p>
}
```

Одинаковые пропсы → одинаковый JSX. Компилятор использует это для мемоизации.

## 2. Не вызывайте хуки в условиях

```tsx
// ❌ Нарушение — хук под условием
function Profile({ user }) {
  if (user) {
    const [name, setName] = useState(user.name)
  }
}

// ✅ Правильно
function Profile({ user }) {
  const [name, setName] = useState(user?.name ?? '')
}
```

## 3. Не мутируйте состояние напрямую

```tsx
// ❌ Нельзя
function TodoList() {
  const [todos, setTodos] = useState([])
  todos.push(newTodo) // мутация
}

// ✅ Можно
function TodoList() {
  const [todos, setTodos] = useState([])
  setTodos([...todos, newTodo])
}
```

## 4. Не мутируйте пропсы

```tsx
// ❌ Нельзя
function Child({ items }: { items: string[] }) {
  items.push('new') // мутация пропса
}

// ✅ Правильно
function Child({ items }: { items: string[] }) {
  const newItems = [...items, 'new']
}
```

## 5. Эффекты — только для синхронизации

```tsx
// ✅ Правильно
useEffect(() => {
  const sub = source.subscribe(callback)
  return () => sub.unsubscribe()
}, [source])

// ❌ Неправильно — данные загружаются в useEffect
useEffect(() => {
  fetch('/api/data').then(setData)
}, [])
```

## Почему это важно

При соблюдении Правил React:

- Компилятор может мемоизировать **всё безопасно**
- Код становится предсказуемым
- Реже возникают баги с устаревшими замыканиями
- Производительность улучшается автоматически

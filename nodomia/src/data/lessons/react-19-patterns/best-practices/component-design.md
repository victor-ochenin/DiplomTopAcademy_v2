# Component Design Principles

## 1. Единственная ответственность

Один компонент — одна задача:

```tsx
// ❌ Смешанные ответственности
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState(null)
  useEffect(() => { fetchUser(userId).then(setUser) }, [userId])
  const [posts, setPosts] = useState([])
  useEffect(() => { fetchPosts(userId).then(setPosts) }, [userId])
  return <div>{/* user + posts */}</div>
}

// ✅ Разделено
function UserProfile({ userId }: { userId: number }) {
  return (
    <div>
      <UserInfo userId={userId} />
      <UserPosts userId={userId} />
    </div>
  )
}
```

## 2. Композиция вместо наследования

```tsx
// ❌ Наследование через HOC
const Enhanced = withAuth(withLogger(withTheme(Component)))

// ✅ Композиция через children
function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  )
}
```

## 3. Иммутабельность данных

```tsx
// ❌ Мутация
function TodoItem({ todo, onUpdate }) {
  const handleToggle = () => {
    todo.done = !todo.done    // мутация исходного объекта
    onUpdate(todo)
  }
}

// ✅ Копирование
function TodoItem({ todo, onUpdate }) {
  const handleToggle = () => {
    onUpdate({ ...todo, done: !todo.done })
  }
}
```

## 4. Подъём состояния

Состояние должно быть у ближайшего общего предка, который использует его.

## 5. Чистота компонентов

Один и те же пропсы → один и тот же JSX. Без сайд-эффектов в render.

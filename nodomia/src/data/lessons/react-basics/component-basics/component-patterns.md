# Component Patterns

## Container vs Presentational

Разделяйте логику и отображение:

```tsx
// Container — управляет данными
function UsersContainer() {
  const [users, setUsers] = useState([])
  return <UsersList users={users} />
}

// Presentational — только отрисовка
function UsersList({ users }) {
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}
```

## Составные компоненты

Компонент, который управляет вложенными дочерними компонентами:

```tsx
function Tabs({ children }) {
  const [active, setActive] = useState(0)
  // логика переключения вкладок
  return <div>{children}</div>
}
```

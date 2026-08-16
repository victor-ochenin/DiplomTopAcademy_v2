# Event Handling Patterns

## Передача аргументов

```tsx
function UserList() {
  function handleDelete(userId) {
    console.log('Удалить пользователя:', userId)
  }

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.name}
          <button onClick={() => handleDelete(user.id)}>
            Удалить
          </button>
        </li>
      ))}
    </ul>
  )
}
```

## Обработчик с event и аргументом

```tsx
function handleInputChange(e, fieldName) {
  setForm(prev => ({ ...prev, [fieldName]: e.target.value }))
}

return (
  <input onChange={(e) => handleInputChange(e, 'name')} />
)
```

## Предотвращение всплытия

```tsx
function handleChildClick(e) {
  e.stopPropagation()
  // клик не всплывёт к родителю
}
```

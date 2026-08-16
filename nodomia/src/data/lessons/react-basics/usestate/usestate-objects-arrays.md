# useState with Objects & Arrays

## Объекты

При обновлении объекта нужно создавать новый объект, а не мутировать старый:

```tsx
const [user, setUser] = useState({ name: '', age: 0 })

// ❌ Мутация — React не перерендерит
user.name = 'Иван'
setUser(user)

// ✅ Новый объект
setUser({ ...user, name: 'Иван' })
```

## Массивы

Для добавления/удаления элементов создавайте новый массив:

```tsx
const [items, setItems] = useState([1, 2, 3])

// Добавление
setItems([...items, 4])

// Удаление по id
setItems(items.filter(i => i !== 2))

// Замена
setItems(items.map(i => i === 1 ? 99 : i))
```

## Функция-апдейтер

Если новое состояние зависит от предыдущего, используйте функцию:

```tsx
setCount(prev => prev + 1)
setUser(prev => ({ ...prev, name: 'Иван' }))
setItems(prev => [...prev, newItem])
```

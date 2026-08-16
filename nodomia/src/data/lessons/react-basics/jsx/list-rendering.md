# Списки рендеринга

React позволяет легко отображать массивы данных в виде элементов UI.

## Рендеринг массива

```tsx
const fruits = ['Яблоко', 'Банан', 'Апельсин']

function FruitList() {
  return (
    <ul>
      {fruits.map((fruit) => (
        <li key={fruit}>{fruit}</li>
      ))}
    </ul>
  )
}
```

## Атрибут key

Каждый элемент в списке должен иметь уникальный `key`.

```tsx
// ✅ Правильно: уникальный id из данных
{items.map(item => <li key={item.id}>{item.name}</li>)}

// ❌ Плохо: индекс массива (если порядок может меняться)
{items.map((item, index) => <li key={index}>{item.name}</li>)}
```

`key` помогает React понимать, какой элемент изменился, удалился или добавился.

## Рендеринг массива объектов

```tsx
interface User {
  id: number
  name: string
  role: string
  age: number
}

function UserTable({ users }: { users: User[] }) {
  return (
    <table>
      <thead>
        <tr><th>Имя</th><th>Роль</th></tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Фильтрация перед рендерингом

```tsx
const adults = users.filter(user => user.age >= 18)
{adults.map(user => <li key={user.id}>{user.name}</li>)}
```

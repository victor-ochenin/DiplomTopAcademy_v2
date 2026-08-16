# Handling Events in React

Обработка событий в React похожа на обычный DOM, но есть отличия.

## Синтаксис

```tsx
function Button() {
  function handleClick() {
    alert('Кнопка нажата!')
  }

  return <button onClick={handleClick}>Нажми меня</button>
}
```

## Отличия от DOM

- События называются в camelCase: `onClick`, `onSubmit`
- Передаётся функция, а не строка
- Не нужно вызывать `addEventListener`

## Параметры события

```tsx
function Form() {
  function handleSubmit(e) {
    e.preventDefault() // отмена перезагрузки
    console.log('Форма отправлена')
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Отправить</button>
    </form>
  )
}
```

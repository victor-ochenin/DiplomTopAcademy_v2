# Passing Props to Components

Props (properties) — это способ передачи данных от родительского компонента дочернему.

## Передача props

```tsx
function App() {
  return <User name="Иван" age={25} isAdmin={true} />
}
```

## Приём props

Компонент получает props как единый объект:

```tsx
function User(props) {
  return (
    <div>
      <p>Имя: {props.name}</p>
      <p>Возраст: {props.age}</p>
    </div>
  )
}
```

## Props только для чтения

React запрещает изменять props внутри компонента. Это сделано для предсказуемости:

```tsx
function User(props) {
  props.name = 'Пётр' // ❌ Ошибка!
  return <p>{props.name}</p>
}
```

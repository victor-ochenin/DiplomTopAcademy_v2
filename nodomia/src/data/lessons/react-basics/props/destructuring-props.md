# Destructuring Props

Вместо обращения к `props.name`, можно деструктурировать объект props прямо в параметрах функции.

## Без деструктуризации

```tsx
function User(props) {
  return (
    <div>
      <p>{props.name}</p>
      <p>{props.email}</p>
    </div>
  )
}
```

## С деструктуризацией

```tsx
function User({ name, email }) {
  return (
    <div>
      <p>{name}</p>
      <p>{email}</p>
    </div>
  )
}
```

## Значения по умолчанию

```tsx
function Button({ text = 'Нажми меня', color = 'blue' }) {
  return <button style={{ backgroundColor: color }}>{text}</button>
}
```

## Rest prop

```tsx
function Input({ label, ...inputProps }) {
  return (
    <label>
      {label}
      <input {...inputProps} />
    </label>
  )
}
```

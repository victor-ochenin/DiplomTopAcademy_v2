# React Synthetic Events

React использует синтетические события (SyntheticEvent) — кросс-браузерную обёртку над нативными событиями.

## Что такое SyntheticEvent?

```tsx
function InputField() {
  function handleChange(e) {
    // e — это SyntheticEvent
    console.log(e.target.value)
  }

  return <input onChange={handleChange} />
}
```

## Особенности

- Работает одинаково во всех браузерах
- События всплывают (bubbling) по умолчанию
- `e.stopPropagation()` и `e.preventDefault()` работают как в обычном DOM

## Пулы событий

В React 17+ синтетические события больше не пулятся. Можно читать поля асинхронно:

```tsx
function handleChange(e) {
  const value = e.target.value // работает всегда
}
```

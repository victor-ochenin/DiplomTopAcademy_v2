# Controlled vs Uncontrolled Components

## Контролируемый компонент

React полностью управляет значением через state:

```tsx
function ControlledInput() {
  const [value, setValue] = useState('')

  function handleChange(e) {
    setValue(e.target.value)
  }

  return <input value={value} onChange={handleChange} />
}
```

## Неконтролируемый компонент

Значение хранится в самом DOM, React не управляет им:

```tsx
function UncontrolledInput() {
  const inputRef = useRef(null)

  function handleSubmit() {
    console.log(inputRef.current.value)
  }

  return <input ref={inputRef} defaultValue="начальное" />
}
```

## Когда что использовать?

- **Контролируемые** — нужна валидация, форматирование, мгновенная обратная связь
- **Неконтролируемые** — простые формы, интеграция с non-React кодом

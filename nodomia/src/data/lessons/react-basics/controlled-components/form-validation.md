# Form Validation Patterns

## Валидация при вводе

```tsx
function EmailInput() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleChange(e) {
    const value = e.target.value
    setEmail(value)
    if (!value.includes('@')) {
      setError('Некорректный email')
    } else {
      setError('')
    }
  }

  return (
    <div>
      <input value={email} onChange={handleChange} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

## Валидация при отправке

```tsx
function handleSubmit(e) {
  e.preventDefault()
  const errors = {}
  if (!form.name) errors.name = 'Обязательное поле'
  if (!form.email.includes('@')) errors.email = 'Некорректный email'
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors)
    return
  }
  // отправить форму
}
```

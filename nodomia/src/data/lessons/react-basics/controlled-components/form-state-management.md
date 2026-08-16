# Form State Management

## Управление несколькими полями

```tsx
function RegistrationForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <form>
      <input name="name" value={form.name} onChange={handleChange} />
      <input name="email" value={form.email} onChange={handleChange} />
      <input name="password" type="password" value={form.password} onChange={handleChange} />
    </form>
  )
}
```

## Отправка формы

```tsx
function handleSubmit(e) {
  e.preventDefault()
  console.log('Отправлено:', form)
}
```

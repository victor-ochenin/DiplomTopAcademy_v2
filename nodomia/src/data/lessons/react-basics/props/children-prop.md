# The Children Prop

`children` — это специальный prop, который содержит всё, что находится между открывающим и закрывающим тегом компонента.

## Использование children

```tsx
function Card({ children }) {
  return <div className="card">{children}</div>
}

function App() {
  return (
    <Card>
      <h2>Заголовок</h2>
      <p>Этот контент попадёт в children</p>
    </Card>
  )
}
```

## Зачем это нужно?

Позволяет создавать компоненты-обёртки:

```tsx
function Layout({ header, children, footer }) {
  return (
    <div>
      <header>{header}</header>
      <main>{children}</main>
      <footer>{footer}</footer>
    </div>
  )
}
```

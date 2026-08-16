# Component Composition

Композиция компонентов — это способ построения UI путём вложения одних компонентов в другие.

## Вложение компонентов

```tsx
function App() {
  return (
    <div>
      <Header />
      <MainContent />
      <Footer />
    </div>
  )
}
```

## Переиспользование

Компоненты можно использовать многократно:

```tsx
function ProductList() {
  return (
    <div>
      <ProductCard name="Ноутбук" price={75000} />
      <ProductCard name="Мышь" price={2500} />
      <ProductCard name="Клавиатура" price={5000} />
    </div>
  )
}
```

## Fragment

Чтобы не добавлять лишние div-ы, используйте Fragment:

```tsx
function List() {
  return (
    <>
      <li>Элемент 1</li>
      <li>Элемент 2</li>
    </>
  )
}
```

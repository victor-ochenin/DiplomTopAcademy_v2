# Context as Provider

React 19 упрощает создание контекста — теперь `<Context.Provider>` заменяется на сам `<Context>`.

## До React 19

```tsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}
```

## React 19

```tsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext value="dark">
      <Toolbar />
    </ThemeContext>
  );
}
```

## Сравнение

|             | До React 19                         | React 19                   |
| ----------- | ----------------------------------- | -------------------------- |
| Провайдер   | `<ThemeContext.Provider value={x}>` | `<ThemeContext value={x}>` |
| Потребитель | `useContext(ThemeContext)`          | `useContext(ThemeContext)` |
| use API     | —                                   | `use(ThemeContext)`        |

## Автомиграция

```bash
npx codemod react/19/remove-context-provider --target .
```

Codemod автоматически найдёт все `<X.Provider>` и заменит на `<X>`.

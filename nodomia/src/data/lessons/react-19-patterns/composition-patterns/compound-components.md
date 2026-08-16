# Compound Components

Compound Components — паттерн, где группа компонентов работает вместе, разделяя неявное состояние через контекст.

## Пример: Select

```tsx
import { createContext, useContext, useState } from 'react'

interface SelectContextType {
  value: string
  onChange: (value: string) => void
}

const SelectContext = createContext<SelectContextType | null>(null)

function Select({ value, onChange, children }: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  )
}

function Option({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(SelectContext)!
  return (
    <div
      className={`option ${ctx.value === value ? 'selected' : ''}`}
      onClick={() => ctx.onChange(value)}
    >
      {children}
    </div>
  )
}

Select.Option = Option
```

## Использование

```tsx
function LanguagePicker() {
  const [lang, setLang] = useState('ru')
  return (
    <Select value={lang} onChange={setLang}>
      <Select.Option value="ru">Русский</Select.Option>
      <Select.Option value="en">English</Select.Option>
      <Select.Option value="de">Deutsch</Select.Option>
    </Select>
  )
}
```

## Преимущества

- Гибкое расположение дочерних элементов
- Изолированное состояние через контекст
- Читаемый, декларативный JSX
- Каждый компонент отвечает за свою часть

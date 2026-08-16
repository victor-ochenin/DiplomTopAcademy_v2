# Директива 'use client'

Директива `'use client'` обозначает границу между серверными и клиентскими компонентами. Она указывает React, что компонент и все его импорты должны работать в браузере.

## Синтаксис

```tsx
'use client'

import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

## Где размещать

Директива **обязана быть первой строкой файла** (до любых импортов):

```tsx
// ✅ правильно
'use client'
import { useState } from 'react'

// ❌ неправильно — импорт до директивы
import { useState } from 'react'
'use client'
```

## Что попадает под 'use client'

- **Весь файл** становится клиентским
- **Все импорты** из этого файла — тоже клиентские
- Дочерние компоненты, если они не помечены `'use client'`, **перестают быть серверными**

## Распространённая ошибка

```tsx
'use client'

import ServerWidget from './ServerWidget.server' // ❌ ошибка!
```

Клиентский компонент **не может импортировать серверный**. Решение — передавать серверный контент через `children`:

```tsx
'use client'

function Wrapper({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return <div>{open && children}</div>
}
```

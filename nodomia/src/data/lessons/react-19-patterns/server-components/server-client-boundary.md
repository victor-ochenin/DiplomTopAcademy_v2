# The Server-Client Boundary

Граница между серверными и клиентскими компонентами — ключевая концепция RSC. Она определяет, где заканчивается серверный рендеринг и начинается клиентский.

## Директива 'use client'

Чтобы сделать компонент клиентским, добавьте `'use client'` в начале файла:

```tsx
'use client';

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Правила границы

1. **Серверный компонент может рендерить клиентский** — но не наоборот
2. **Клиентский компонент не может импортировать серверный** — только через children/props
3. **Все импорты внутри клиентского компонента — тоже клиентские**

## Поток данных

```
Server Component
  └── Client Component A  ← граница 'use client'
        ├── Client Component B
        └── Server Component ❌ — нельзя!

// ✅ Правильный паттерн — передача через children:
function Wrapper({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(true)
  return <div>{show && children}</div>
}
```

## Почему это важно

- Серверные компоненты сокращают размер JS-бандла
- Клиентские компоненты остаются интерактивными
- Чёткая граница предотвращает случайную утечку серверного кода в браузер

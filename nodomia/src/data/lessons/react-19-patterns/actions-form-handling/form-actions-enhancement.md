# Form Actions и прогрессивное улучшение

**Прогрессивное улучшение (Progressive Enhancement)** — подход, при котором форма работает даже без JavaScript, а после загрузки скриптов получает расширенное поведение.

## Как это работает в React 19

```tsx
async function searchAction(formData: FormData) {
  const query = formData.get('query')
  const results = await searchDatabase(query)
  return results
}

function SearchForm() {
  const [results, formAction, isPending] = useActionState(searchAction, [])

  return (
    <>
      <form action={formAction}>
        <input name="query" type="search" placeholder="Поиск..." />
        <button type="submit">Найти</button>
      </form>

      {isPending && <p>Загрузка...</p>}

      <ul>
        {results.map(item => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </>
  )
}
```

Даже если JavaScript не загрузился, форма отправится на сервер естественным образом. После загрузки React перехватывает отправку и обрабатывает её через action.

## Преимущества

| Сценарий | Без JS | С JS |
|---|---|---|
| Отправка формы | Браузером по URL | Перехватывается React |
| Обновление страницы | Полная перезагрузка | Асинхронное, без перезагрузки |
| Результат | Сервер возвращает HTML | Action возвращает данные, UI обновляется точечно |

## Атрибут action и пропс action

- `<form action="/api/search">` — нативный HTML-атрибут (URL отправки)
- `<form action={searchAction}>` — React пропс (асинхронная функция)

React 19 позволяет комбинировать оба подхода: если нет JS — сработает HTML-атрибут, если есть — React обработает через action.

## Продвинутый пример: форма с сабмитом через кнопки

```tsx
function OrderForm() {
  const [state, formAction] = useActionState(processOrder, null)

  return (
    <form action={formAction}>
      <input name="productId" type="hidden" value="123" />

      <button type="submit" name="action" value="save">
        Сохранить черновик
      </button>
      <button type="submit" formAction={submitOrder}>
        Отправить заказ
      </button>
    </form>
  )
}
```

Каждая кнопка может иметь собственное действие через `formAction`, позволяя одному `<form>` элементу обрабатывать разные типы отправки.

# Cleanup Functions

Функция очистки (cleanup) вызывается перед удалением эффекта.

## Зачем нужен cleanup?

- Отмена подписок
- Очистка таймеров
- Отмена запросов к API

## Пример с таймером

```tsx
function Timer() {
  const [time, setTime] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(id) // cleanup
  }, [])
}
```

## Пример с подпиской

```tsx
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()

    return () => connection.disconnect()
  }, [roomId])
}
```

Cleanup гарантирует, что не будет утечек памяти при размонтировании компонента.

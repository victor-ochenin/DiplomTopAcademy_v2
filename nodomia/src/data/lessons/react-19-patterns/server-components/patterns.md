# Server Component Patterns

## 1. Компонент с данными

Серверный компонент идеально подходит для загрузки и отображения данных:

```tsx
// PostsList.server.tsx
async function PostsList() {
  const posts = await fetchPosts()
  return (
    <div>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
```

## 2. Клиентская обёртка для серверного контента

Серверный компонент подготавливает данные → передаёт их в клиентский компонент:

```tsx
// Page.server.tsx
async function Page() {
  const posts = await db.query('SELECT * FROM posts')
  return <InteractiveList initialPosts={posts} />
}

// InteractiveList.client.tsx
function InteractiveList({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts)
  // ... сортировка, фильтрация на клиенте
}
```

## 3. Композиция через children

Самый гибкий паттерн — серверный компонент рендерит клиентскую обёртку, которая принимает серверный контент как `children`:

```tsx
// Layout.server.tsx
function Layout({ children }) {
  return <div className="container">{children}</div>
}

// Dashboard.client.tsx
function Dashboard() {
  return <Layout><ServerWidget /></Layout>
}

// ServerWidget.server.tsx
async function ServerWidget() {
  const data = await loadHeavyData()
  return <div>{/* ... */}</div>
}
```

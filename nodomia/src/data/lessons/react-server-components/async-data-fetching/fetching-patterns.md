# Паттерны загрузки данных

## 1. Загрузка в корневом компоненте

Данные загружаются на самом верхнем уровне и передаются вниз по дереву:

```tsx
async function Page() {
  const posts = await fetchPosts();
  const categories = await fetchCategories();

  return (
    <div>
      <Sidebar categories={categories} />
      <PostsList posts={posts} />
    </div>
  );
}
```

## 2. Загрузка в каждом компоненте

Каждый компонент сам отвечает за свои данные — лучшая изоляция:

```tsx
async function Sidebar() {
  const categories = await fetchCategories();
  return <nav>{/* ... */}</nav>;
}

async function PostsList() {
  const posts = await fetchPosts();
  return <ul>{/* ... */}</ul>;
}
```

## 3. Комбинация с Suspense

Разные части страницы загружаются независимо:

```tsx
function Page() {
  return (
    <div>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <PostsList />
      </Suspense>
    </div>
  );
}
```

## 4. Серверная пагинация

```tsx
async function PostsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const { posts, totalPages } = await fetchPostsPage(page);

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <Pagination current={page} total={totalPages} />
    </div>
  );
}
```

## Рекомендации

- Данные для одной страницы — загружайте параллельно
- Кэшируйте повторяющиеся запросы через `cache()`
- Используйте Suspense для загрузки по частям
- Избегайте водопадов — запросы не должны ждать друг друга без необходимости

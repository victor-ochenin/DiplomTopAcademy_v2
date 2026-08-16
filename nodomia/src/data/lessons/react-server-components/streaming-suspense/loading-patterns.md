# Паттерны состояния загрузки

## 1. Один Suspense на весь контент

```tsx
function Page() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
```

**Когда использовать**: страница с двумя-тремя быстрыми запросами, где отдельные скелетоны выглядят дёргано.

## 2. Несколько Suspense для независимых секций

```tsx
function Page() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <AsyncHeader />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>
      <Suspense fallback={<FooterSkeleton />}>
        <AsyncFooter />
      </Suspense>
    </div>
  );
}
```

**Когда использовать**: виджеты/секции не зависят друг от друга и загружаются с разной скоростью.

## 3. Вложенные Suspense

```tsx
function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AsyncPage>
        <Suspense fallback={<DetailSkeleton />}>
          <SlowDetail />
        </Suspense>
      </AsyncPage>
    </Suspense>
  );
}
```

**Когда использовать**: есть общая загрузка страницы и отдельная — для более медленного вложенного блока.

## 4. Кастомные скелетоны

Вместо `<p>Загрузка...</p>` используйте полноценные скелетоны, которые визуально занимают место будущего контента:

```tsx
function PostSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}
```

## Рекомендации

- Каждый асинхронный компонент — своя `Suspense` граница
- Skeletons визуально совпадают с финальным контентом
- Избегайте layout shift — скелетоны должны занимать то же место
- Группируйте быстрые запросы вместе, медленные — отдельно

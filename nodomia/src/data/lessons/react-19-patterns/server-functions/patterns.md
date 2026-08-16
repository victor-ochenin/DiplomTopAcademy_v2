# Server Function Patterns

## 1. Форма с валидацией

```tsx
'use server';

import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
});

export async function createPost(
  prev: { error?: string } | null,
  formData: FormData,
) {
  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await db.query('INSERT INTO posts (title, content) VALUES ($1, $2)', [
    parsed.data.title,
    parsed.data.content,
  ]);

  return { error: undefined };
}
```

## 2. Мутация с перезагрузкой данных

```tsx
'use server';

export async function revalidateTodos() {
  revalidatePath('/todos');
}

// На клиенте:
function TodoActions() {
  const toggleTodo = async (id: number) => {
    'use server';
    await db.query('UPDATE todos SET done = NOT done WHERE id = $1', [id]);
    revalidatePath('/todos');
  };

  return <button formAction={toggleTodo}>Готово</button>;
}
```

## 3. Интеграция с хуками

```tsx
'use client';

function LikeButton({ postId }: { postId: number }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    0,
    (state) => state + 1,
  );

  const likeAction = async () => {
    'use server';
    await db.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [
      postId,
    ]);
  };

  return (
    <form action={likeAction}>
      <button type="submit" onClick={() => addOptimisticLike()}>
        ❤️ {optimisticLikes}
      </button>
    </form>
  );
}
```

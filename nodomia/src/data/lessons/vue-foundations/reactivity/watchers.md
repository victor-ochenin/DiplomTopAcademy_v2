# Введение в watchers

Watchers (наблюдатели) позволяют выполнить **побочный эффект** при изменении данных.

## watch

`watch()` следит за конкретным источником и вызывает колбэк при его изменении:

```vue
<script setup>
import { ref, watch } from 'vue';

const query = ref('');

watch(query, (newValue, oldValue) => {
  console.log('Запрос изменился:', newValue);
});
</script>
```

## watchEffect

`watchEffect()` автоматически отслеживает все реактивные значения, использованные внутри:

```vue
<script setup>
import { ref, watchEffect } from 'vue';

const count = ref(0);

watchEffect(() => {
  console.log('Текущее значение:', count.value);
});
</script>
```

Колбэк выполняется сразу и потом при каждом изменении зависимостей.

## Типичные сценарии

- **Сохранение в localStorage** — при изменении данных:

```js
watch(user, (value) => {
  localStorage.setItem('user', JSON.stringify(value));
});
```

- **Загрузка данных** при изменении параметров запроса.
- **Синхронизация** с внешним сервисом.

## Когда НЕ использовать watchers

Если нужно просто **вычислить** значение для шаблона — используйте `computed`, а не `watch`. Watchers нужны для действий с побочными эффектами, а не для производных значений.

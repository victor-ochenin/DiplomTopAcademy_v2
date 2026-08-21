# Понимание ref() для реактивного состояния

`ref()` — это функция Composition API для создания **реактивного состояния**.

## Синтаксис

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);
</script>
```

`ref` оборачивает значение в объект-обёртку. Доступ к значению — через свойство `.value`:

```js
count.value = count.value + 1;
```

## В шаблоне — без .value

Vue автоматически **разворачивает** ref в шаблонах, поэтому `.value` там не нужен:

```vue
<template>
  <p>Счёт: {{ count }}</p>
  <button @click="count++">+1</button>
</template>
```

## Пример счётчика

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <p>Счёт: {{ count }}</p>
  <button @click="count++">+1</button>
  <button @click="count--">-1</button>
</template>
```

Изменение `count` автоматически обновляет интерфейс — это и есть реактивность.
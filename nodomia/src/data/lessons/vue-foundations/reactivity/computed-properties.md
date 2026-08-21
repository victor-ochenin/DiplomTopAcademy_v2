# Computed-свойства для производного состояния

Иногда значение зависит от другого состояния. Для таких **производных** значений используют `computed()`.

## Без computed: дублирование логики

```vue
<template>
  <p>{{ items.length > 0 ? 'Есть элементы' : 'Пусто' }}</p>
</template>
```

Если логика повторяется в нескольких местах, её выносят в `computed`.

## С computed

```vue
<script setup>
import { ref, computed } from 'vue';

const items = ref(['Яблоко']);

const hasItems = computed(() => items.value.length > 0);
</script>

<template>
  <p>{{ hasItems ? 'Есть элементы' : 'Пусто' }}</p>
</template>
```

`computed` принимает функцию, которая возвращает производное значение.

## Кэширование

Главное отличие `computed` от обычного метода — **кэширование**:

- computed пересчитывается только при изменении своих зависимостей;
- метод выполняется при каждом рендере.

```vue
<script setup>
import { reactive, computed } from 'vue';

const user = reactive({ name: 'Иван', surname: 'Петров' });

const fullName = computed(() => `${user.name} ${user.surname}`);
</script>
```

Пока `user.name` и `user.surname` не изменились, `fullName` не будет пересчитываться.
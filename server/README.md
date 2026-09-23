# Nodomia Server

RAG-сервер для образовательного расширения Nodomia. Обрабатывает вопросы пользователя по материалам курсов и проверяет код заданий.

Сервер использует Retrieval-Augmented Generation: запрос пользователя векторизуется, в ChromaDB ищутся релевантные фрагменты курсов, и LLM формирует ответ строго на их основе. Решения о маршруте запроса, фильтрации контекста и вердикте по коду принимает TypeSafe (`jev` / System One): код владеет порогами, LLM пишет текст.

## Архитектура

```
POST /api/query  ─→  queryRag()
  1. routing.ts   → TypeSafe Choice: course_question | meta_question | off_topic
  2. retrieval.ts → TypeSafe Score/Noul: фильтр relevance / injection / contradicts
  3. query.ts     → OpenRouter LLM: ответ по отфильтрованному контексту

POST /api/check-code  ─→  checkCode()
  grading.ts → TypeSafe Noul/Score: типизированный вердикт по критериям
  query.ts   → buildFeedback(): фидбек в коде из вердикта

Зависимости:
  ├── LLM: OpenRouter (instruct-модель + embedding)
  ├── TypeSafe: System One (choice / noul / score)
  ├── Vector Store: ChromaDB (докер-контейнер)
  └── Web Fetcher: cheerio (скачивание документации)
```

Разделение труда: TypeSafe выдаёт структурированное суждение, код применяет пороги и политику, LLM формулирует текст. Битый JSON из LLM невозможен.

## Компоненты

### `src/index.ts`

Точка входа. Hono-приложение с двумя роутами:

| Роут                   | Описание                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/query`      | Принимает вопрос и историю диалога. Роутит намерение, при вопросе по курсу ищет и фильтрует контекст, возвращает ответ LLM. |
| `POST /api/check-code` | Принимает код пользователя, условие задания и критерии. TypeSafe оценивает вердикт, фидбек собирается в коде: passed + feedback. |

Ошибки TypeSafe маппятся в HTTP: `429`/`5xx` → `503`, транспортные → `503`, прочие API-ошибки → `502`.

### `src/rag/`

| Файл             | Назначение                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `routing.ts`     | Роутинг запроса: TypeSafe `choice` (`course_question` / `meta_question` / `off_topic`). Ниже `ROUTING_CONFIDENCE_MIN` (0.6) — уточняющий вопрос; off-topic — фиксированный отказ; meta — LLM без RAG. |
| `retrieval.ts`   | Фильтр контекста: по одному Score (relevance) и двум Noul (injection, contradicts) на фрагмент. Пороги `RELEVANCE_MIN` / `INJECTION_MAX` / `CONTRADICTS_MAX` — именованные константы. |
| `grading.ts`     | Типизированный вердикт по коду: Noul на каждый критерий + блокирующее нарушение + общий Score. Пороги `PASS_THRESHOLD` / `CRITERION_THRESHOLD` / `BLOCKING_THRESHOLD`. Клиент TypeSafe и хелперы разбора ответов. |
| `query.ts`       | Оркестрация: `queryRag` (роутинг → поиск → фильтр → LLM), `checkCode` (вердикт + `buildFeedback`), `openRouterFetch` (200 без choices → 503 для ретраев SDK). |
| `vectorStore.ts` | Клиент ChromaDB. Инициализация индекса, вставка документов, поиск. Вычисление контрольной суммы (SHA-256) для отслеживания изменений в данных. |
| `embeddings.ts`  | Кастомная функция эмбеддингов (`OpenRouterEmbeddingFunction`) — адаптер ChromaDB к OpenRouter API.                                             |
| `webFetcher.ts`  | Сбор официальной документации React и Vue через cheerio. Разбивка страниц на чанки, загрузка по списку URL из конфига.                         |

### Пороги

Все пороги — явные именованные константы в коде, не в промпте:

| Константа | Модуль | Назначение |
| --- | --- | --- |
| `ROUTING_CONFIDENCE_MIN = 0.6` | `routing.ts` | Ниже — уточняющий вопрос вместо угадывания |
| `RELEVANCE_MIN = 1` | `retrieval.ts` | Минимальный Score релевантности фрагмента (0..2) |
| `INJECTION_MAX = 0.7` | `retrieval.ts` | Noul prompt-injection ≥ порога — фрагмент отбрасывается |
| `CONTRADICTS_MAX = 0.7` | `retrieval.ts` | Noul противоречия ≥ порога — фрагмент отбрасывается |
| `PASS_THRESHOLD = 0.8` | `grading.ts` | Среднее покрытие критериев для `passed` |
| `CRITERION_THRESHOLD = 0.5` | `grading.ts` | Noul критерия ниже — критерий в `failedCriteria` |
| `BLOCKING_THRESHOLD = 0.7` | `grading.ts` | Блокирующее нарушение |
| `BLOCKING_UNCERTAIN_LOW = 0.35` | `grading.ts` | Серая зона → `needsReview` |

### `data/`

| Путь                      | Назначение                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/chroma/`            | Персистентное хранилище ChromaDB. Контрольные суммы (`checksum.txt`, `web-checksum.txt`) для отслеживания изменений в курсах и веб-источниках. |
| `data/lessons/`           | Копия данных уроков из extension. Синхронизируется при запуске.                                                                                |
| `data/web-sources/*.json` | Списки URL официальной документации (React, Vue) для индексации в ChromaDB. Находятся в репозитории.                                           |

### Данные сервера

- `data/lessons/` — копия уроков из расширения (`../nodomia/src/data/lessons`), обновляется при каждом `npm run dev` хуком `predev`; в репозиторий не входит;
- `data/web-sources/` — конфигурация источников для скрапинга (`react-docs.json`, `vue-docs.json`); **в репозитории** — это контент, а не генерируемые данные;
- `data/chroma/` — база ChromaDB и контрольные суммы; создаётся при запуске, в репозиторий не входит.

## Данные в векторном хранилище

ChromaDB содержит два типа документов:

1. **Материалы курсов** — JSON + Markdown из расширения. Загружаются с диска, разбиваются на чанки и векторизуются. Контрольная сумма определяет, нужно ли переиндексировать.
2. **Веб-документация** — страницы официальной документации React и Vue, скачанные через cheerio. URL настраиваются в `data/web-sources/*.json`. Отдельная контрольная сумма для веб-источников.

Поиск идёт параллельно по обеим коллекциям (по 4 лучших фрагмента из каждой); фрагменты помечаются метками источника («Официальная документация» / «Урок»), проходят фильтр `retrieval.ts` и только затем попадают в промпт LLM.

## Окружение

`.env` рядом с `package.json` (см. `.env.example`):

| Переменная | Назначение |
| --- | --- |
| `OPENAI_API_KEY` | Ключ OpenRouter (LLM + embedding) |
| `OPENAI_BASE_URL` | Base URL API (по умолчанию `https://openrouter.ai/api/v1`) |
| `TYPESAFE_API_KEY` | Ключ TypeSafe — **только на сервере**, не в extension/WebView |
| `PORT` | Порт HTTP-сервера (по умолчанию `3001`) |

## Запуск

```sh
cp .env.example .env   # заполнить ключи
docker compose up -d   # ChromaDB на :8000
npm ci
npm run dev            # http://localhost:3001
```

## Тесты

```sh
npm test           # vitest: unit + integration
npm run typecheck  # tsc --noEmit
npm run format:check
```

Юнит-тесты покрывают `routing`, `retrieval`, `grading`, `query` (ветки роутинга), `vectorStore`, `embeddings`, `webFetcher`, `openRouterFetch`. Интеграционные — HTTP-роуты и `check-code` на реальных данных.

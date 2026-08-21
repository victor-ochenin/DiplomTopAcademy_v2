# Nodomia

Расширение для VS Code — образовательный тренажёр по React и Vue с персонализированным RAG-ассистентом.

Пользователь проходит мини-курсы с теорией и практическими заданиями прямо в редакторе. Ассистент отвечает на вопросы строго по материалам курса, анализирует код пользователя и помогает разобраться в теме, но не пишет код за него.

## Установка

Скачайте `.vsix` со страницы [Releases](https://github.com/victor-ochenin/DiplomTopAcademy_v2/releases) и установите через VS Code: палитра команд → **Extensions: Install from VSIX**.

> **Требуется сервер**: RAG-ассистент и LLM-проверка coding-заданий работают только при локально запущенном RAG-сервере. Без него доступны курсы, теория и задания с проверкой на стороне UI (choice/open).
>
> Запуск сервера:
>
> ```
> git clone https://github.com/victor-ochenin/DiplomTopAcademy_v2.git
> cd DiplomTopAcademy_v2/server
> cp .env.example .env        # указать ключ OpenRouter
> docker compose up -d        # ChromaDB
> npm ci && npm run dev       # http://localhost:3001
> ```

## Архитектура

Проект разделён на три слоя:

```
WebView (React SPA)  ←→  Extension Host  ←→  RAG Server
   webview-ui/              src/                server/
```

**WebView** — React-интерфейс, встроенный в боковую панель VS Code. Отображает список курсов, уроки с теорией (Markdown), задания трёх типов и панель RAG-ассистента.

**Extension Host** — мост между интерфейсом и системой VS Code. Управляет состоянием прогресса, загружает данные курсов с диска, маршаллизует сообщения между WebView и RAG-сервером.

**RAG Server** — внешний HTTP-сервер с Retrieval-Augmented Generation на базе ChromaDB и OpenRouter. Обрабатывает вопросы по материалу и проверяет код заданий.

## Компоненты

### Extension (`src/`)

| Файл                                | Назначение                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extension.ts`                      | Точка входа. Инициализирует данные курсов и регистрирует провайдер WebView.                                                                        |
| `data/schemas.ts`                   | Единый источник формы данных (zod). От него производятся типы `types.ts` и валидатор `validate-data.ts`.                                           |
| `types.ts`                          | Типы курсов: Course, CourseListItem, Lesson, Task (choice / open / coding), Document, Resource — производные от `data/schemas.ts` через `z.infer`. |
| `protocol.ts`                       | Типы и zod-валидация сообщений WebView ↔ extension (WebviewMessage, ExtensionMessage).                                                             |
| `webview/nodomiaWebviewProvider.ts` | WebviewViewProvider — получает сообщения от WebView (валидирует через `protocol.ts`), перенаправляет запросы к данным курсов или к RAG-серверу.    |
| `data/courses/courseLoader.ts`      | Загрузчик курсов.`loadCourseListAsync` — список (метаданные без уроков), `loadCourseDetailsAsync` — полный курс с уроками по id.                   |
| `data/courses/index.ts`             | Barrel: реэкспортирует публичный API загрузчика из `courseLoader.ts`.                                                                              |

### WebView (`webview-ui/`)

React SPA, запускается внутри VS Code WebView. Связь с extension'ом — через `acquireVsCodeApi()` (postMessage / onDidReceiveMessage).

| Файл                            | Назначение                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                   | Корневой компонент: список курсов / просмотр урока. Состояние: courses, progress, loading.                      |
| `src/hooks/useVsCodeApi.ts`     | Обёртка над`acquireVsCodeApi()`. Возвращает postMessage, getState, setState. Подписывается на `window.message`. |
| `src/hooks/useRagState.ts`      | Сохраняет состояние панели RAG (открыта/закрыта) через`vscode.setState`.                                        |
| `src/types/messages.ts`         | Типы сообщений WebView ↔ extension (реэкспорт из `src/protocol.ts`).                                            |
| `src/components/Courses/`       | CoursesPage, CourseCard, CourseTab — список курсов, карточки с прогрессом, аккордеон уроков.                    |
| `src/components/LessonView.tsx` | Рендер Markdown-теории (react-markdown + rehype-highlight).                                                     |
| `src/components/Tasks/`         | TaskRenderer, ChoiceTask, OpenTask, CodingTask — три типа заданий.                                              |
| `src/components/RagAssistant/`  | RagAssistant + RagSidePanel — чат с RAG-ассистентом, сообщения, таймаут 30 с.                                   |

## Данные курсов

Курсы хранятся в формате JSON + Markdown:

```
src/data/
  courses/
    react-basics.json            — метаданные курса, ссылки на уроки
    react-19-patterns.json
    react-server-components.json
    vue-foundations.json
  lessons/
    react-basics/
      what-is-react/
        lesson.json              — структура урока: id, title, документы, задания
        react-intro.md           — контент документа (Markdown)
        ...
```

Каждый курс — один JSON-файл. Каждый урок — папка с `lesson.json` и `.md`-файлами контента. Загрузчик (`loadCourseListAsync`) читает метаданные всех курсов при старте; детали конкретного курса (`loadCourseDetailsAsync`) загружаются по требованию при клике.

Форма данных описывается zod-схемами в `src/data/schemas.ts`; проверка данных — `npm run validate:data`. Новый урок создаётся командой `npm run new:lesson -- <courseId> <lessonId> <title>`.

### Типы заданий

- **choice** — выбор правильного варианта из нескольких
- **open** — свободный ответ, проверка по ключевым словам
- **coding** — практическое задание: написать код в своей директории. Отправляется на RAG-сервер для LLM-проверки.

### Прогресс

Прогресс пользователя сохраняется в `context.globalState` VS Code (ключ `nodomia.progress`). Данные хранятся между сессиями.

Прогресс отображается в карточках курсов и в аккордеоне уроков (процент выполнения, статус заданий).

## RAG-ассистент

Ассистент доступен в боковой панели WebView. Отправляет вопрос на сервер (`POST /api/query`) через extension-прокси. RAG-сервер ищет релевантные фрагменты курсов в ChromaDB и формирует ответ через OpenRouter LLM.

- Таймаут ожидания ответа — 30 секунд. Если сервер не отвечает — сообщение об ошибке.
- В каждом запросе передаётся последние 5 сообщений как контекст диалога.

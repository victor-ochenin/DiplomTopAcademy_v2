# Nodomia

Образовательный тренажёр по React в виде расширения VS Code с персонализированным RAG-ассистентом.

> Этот репозиторий — продолжение
> [DiplomTopAcademy](https://github.com/victor-ochenin/DiplomTopAcademy).

## Структура

- `nodomia/` — VS Code-расширение (WebView + extension host, данные курсов, RAG-ассистент)
- `server/` — внешний RAG-сервер (Hono + ChromaDB + OpenRouter): векторный поиск и проверка кода через LLM

## Запуск

см. `nodomia/README.md` и `server/README.md`.

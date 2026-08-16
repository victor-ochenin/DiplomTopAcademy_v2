import * as fs from 'fs';
import * as path from 'path';
import type { Course, Lesson, CourseListItem } from '../../types';
import { CourseSchema, LessonFileSchema } from '../schemas';

let basePath = '';

// Задаёт корневой путь, от которого читаются файлы курсов. Вызывается при активации расширения.
export function initCourses(base: string) {
  if (!base || typeof base !== 'string') {
    console.error('Nodomia: initCourses requires a valid base path');
    return;
  }
  basePath = base;
}

let listCache: CourseListItem[] | null = null;
let detailsCache = new Map<string, Course>();

// Безопасный JSON.parse: при ошибке логирует и возвращает null вместо исключения.
function parseJsonSafe(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Nodomia: failed to parse JSON (${label})`, err);
    return null;
  }
}

// Асинхронно читает файл. Различает ошибку «файл не найден» (warn) и прочие (error). Возвращает null при неудаче.
async function loadFileAsync(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      console.error(`Nodomia: file not found: ${filePath}`);
    } else {
      console.error(`Nodomia: failed to read ${filePath}`, err);
    }
    return null;
  }
}

// Читает lesson.json по рефу и возвращает объект Lesson (включая содержимое .md документов).
async function parseLessonAsync(ref: string): Promise<Lesson | null> {
  const raw = await loadFileAsync(path.join(basePath, ref));
  if (!raw) { return null; }

  const lesson = LessonFileSchema.safeParse(parseJsonSafe(raw, `lesson ${ref}`));
  if (!lesson.success) {
    console.error(`Nodomia: invalid lesson ${ref}:`, lesson.error.issues);
    return null;
  }

  const docs = await Promise.all(
    lesson.data.documents.map(async (doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.contentFile
        ? (await loadFileAsync(path.join(basePath, doc.contentFile))) ?? ''
        : '',
    }))
  );

  return { ...lesson.data, documents: docs };
}

// Читает course.json по пути и возвращает объект Course, рекурсивно разбирая уроки.
async function parseCourseAsync(filePath: string): Promise<Course | null> {
  const raw = await loadFileAsync(filePath);
  if (!raw) { return null; }

  const course = CourseSchema.safeParse(parseJsonSafe(raw, `course ${filePath}`));
  if (!course.success) {
    console.error(`Nodomia: invalid course ${filePath}:`, course.error.issues);
    return null;
  }

  const lessons = (await Promise.all(
    course.data.lessons.map((ref) => parseLessonAsync(ref))
  )).filter((l: Lesson | null): l is Lesson => l !== null);

  return {
    id: course.data.id,
    title: course.data.title,
    description: course.data.description,
    level: course.data.level,
    icon: course.data.icon,
    lessons,
  };
}

// Лёгкое чтение lesson.json без загрузки .md: возвращает только id и счётчики документов/задач.
async function readLessonMetaAsync(ref: string): Promise<{ id: string; docCount: number; taskCount: number }> {
  const raw = await loadFileAsync(path.join(basePath, ref));
  if (!raw) { return { id: '', docCount: 0, taskCount: 0 }; }
  const lesson = LessonFileSchema.safeParse(parseJsonSafe(raw, `lesson meta ${ref}`));
  if (!lesson.success) { return { id: '', docCount: 0, taskCount: 0 }; }
  return {
    id: lesson.data.id,
    docCount: lesson.data.documents.length,
    taskCount: lesson.data.tasks.length,
  };
}

// Возвращает абсолютные пути ко всем course.json в директории src/data/courses.
async function getJsonFiles(): Promise<string[]> {
  const coursesDir = path.join(basePath, 'src', 'data', 'courses');
  let files: string[];
  try {
    files = await fs.promises.readdir(coursesDir);
  } catch (err) {
    console.error(`Nodomia: failed to read courses directory ${coursesDir}`, err);
    return [];
  }
  return files.filter(f => f.endsWith('.json') && f.length > 5).map(f => path.join(coursesDir, f));
}

// Публичный API: возвращает список курсов с метаданными (без контента уроков). Кэшируется.
export async function loadCourseListAsync(): Promise<CourseListItem[]> {
  if (listCache) { return listCache; }
  if (!basePath) {
    console.error('Nodomia: CourseLoader not initialized');
    return [];
  }

  const files = await getJsonFiles();

  const rawCourses = await Promise.all(files.map(f => loadFileAsync(f)));

  const results = await Promise.all(
    rawCourses.map(async (raw, i): Promise<CourseListItem | null> => {
      if (!raw) { return null; }
      const course = CourseSchema.safeParse(parseJsonSafe(raw, `course ${files[i]}`));
      if (!course.success) { return null; }

      const metas = await Promise.all(course.data.lessons.map((ref) => readLessonMetaAsync(ref)));

      let taskCount = 0;
      let itemsCount = 0;
      const lessonIds: string[] = [];
      for (const meta of metas) {
        if (meta.id) { lessonIds.push(meta.id); }
        taskCount += meta.taskCount;
        itemsCount += meta.docCount + meta.taskCount;
      }

      return {
        id: course.data.id,
        title: course.data.title,
        description: course.data.description,
        level: course.data.level,
        icon: course.data.icon,
        lessonCount: course.data.lessons.length,
        taskCount,
        itemsCount,
        lessonIds,
      };
    })
  );

  const items = results.filter((r): r is CourseListItem => r !== null);

  const levelOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  items.sort((a, b) => (levelOrder[a.level] ?? 0) - (levelOrder[b.level] ?? 0));

  listCache = items;
  return items;
}

// Публичный API: возвращает полный курс по id (с уроками и контентом). Кэшируется.
export async function loadCourseDetailsAsync(id: string): Promise<Course | null> {
  if (detailsCache.has(id)) { return detailsCache.get(id) ?? null; }
  if (!basePath) {
    console.error('Nodomia: CourseLoader not initialized');
    return null;
  }

  const files = await getJsonFiles();

  const rawCourses = await Promise.all(files.map(f => loadFileAsync(f)));

  for (let i = 0; i < files.length; i++) {
    const raw = rawCourses[i];
    if (!raw) { continue; }
    const data = parseJsonSafe(raw, `course ${files[i]}`);
    if (!data || typeof data !== 'object') { continue; }
    if ((data as Record<string, unknown>).id === id) {
      const course = await parseCourseAsync(files[i]);
      if (course) { detailsCache.set(id, course); }
      return course;
    }
  }

  return null;
}

import * as fs from 'fs';
import * as path from 'path';
import type { Course, Lesson, CourseListItem, Level } from '../../types';
import { CourseSchema, LessonFileSchema } from '../schemas';

let basePath = '';
let allCoursesCache: Map<string, Course> | null = null;

// Задаёт корневой путь, от которого читаются файлы курсов. Вызывается при активации расширения.
export function initCourses(base: string) {
  if (!base || typeof base !== 'string') {
    console.error('Nodomia: initCourses requires a valid base path');
    return;
  }
  if (base !== basePath) {
    basePath = base;
    allCoursesCache = null;
  }
}

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
  if (!raw) {
    return null;
  }

  const lesson = LessonFileSchema.safeParse(
    parseJsonSafe(raw, `lesson ${ref}`),
  );
  if (!lesson.success) {
    console.error(`Nodomia: invalid lesson ${ref}:`, lesson.error.issues);
    return null;
  }

  const docs = await Promise.all(
    lesson.data.documents.map(async (doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.contentFile
        ? ((await loadFileAsync(path.join(basePath, doc.contentFile))) ?? '')
        : '',
    })),
  );

  return { ...lesson.data, documents: docs };
}

// Читает course.json по пути и возвращает объект Course, рекурсивно разбирая уроки.
async function parseCourseAsync(filePath: string): Promise<Course | null> {
  const raw = await loadFileAsync(filePath);
  if (!raw) {
    return null;
  }

  const course = CourseSchema.safeParse(
    parseJsonSafe(raw, `course ${filePath}`),
  );
  if (!course.success) {
    console.error(`Nodomia: invalid course ${filePath}:`, course.error.issues);
    return null;
  }

  const lessons = (
    await Promise.all(course.data.lessons.map((ref) => parseLessonAsync(ref)))
  ).filter((l: Lesson | null): l is Lesson => l !== null);

  if (lessons.length !== course.data.lessons.length) {
    console.error(
      `Nodomia: course ${course.data.id} rejected: broken lesson references`,
    );
    return null;
  }

  return {
    id: course.data.id,
    title: course.data.title,
    description: course.data.description,
    level: course.data.level,
    icon: course.data.icon,
    lessons,
  };
}

// Возвращает абсолютные пути ко всем course.json в директории src/data/courses.
async function getJsonFiles(): Promise<string[]> {
  const coursesDir = path.join(basePath, 'src', 'data', 'courses');
  let files: string[];
  try {
    files = await fs.promises.readdir(coursesDir);
  } catch (err) {
    console.error(
      `Nodomia: failed to read courses directory ${coursesDir}`,
      err,
    );
    return [];
  }
  return files
    .filter((f) => f.endsWith('.json') && f.length > 5)
    .map((f) => path.join(coursesDir, f));
}

// Читает все курсы и уроки один раз; результат кэшируется и переиспользуется обоими публичными API.
async function loadAllCoursesAsync(): Promise<Map<string, Course>> {
  if (allCoursesCache) {
    return allCoursesCache;
  }
  if (!basePath) {
    console.error('Nodomia: CourseLoader not initialized');
    return new Map();
  }

  const files = await getJsonFiles();
  const parsed = await Promise.all(files.map((f) => parseCourseAsync(f)));

  const map = new Map<string, Course>();
  for (const course of parsed) {
    if (course) {
      map.set(course.id, course);
    }
  }
  allCoursesCache = map;
  return map;
}

// Публичный API: возвращает список курсов с метаданными (без контента уроков). Кэшируется.
export async function loadCourseListAsync(): Promise<CourseListItem[]> {
  const map = await loadAllCoursesAsync();

  const items: CourseListItem[] = [];
  for (const course of map.values()) {
    let taskCount = 0;
    let itemsCount = 0;
    for (const lesson of course.lessons) {
      taskCount += lesson.tasks.length;
      itemsCount += lesson.documents.length + lesson.tasks.length;
    }
    items.push({
      id: course.id,
      title: course.title,
      description: course.description,
      level: course.level,
      icon: course.icon,
      lessonCount: course.lessons.length,
      taskCount,
      itemsCount,
      lessonIds: course.lessons.map((l) => l.id),
    });
  }

  const levelOrder: Record<Level, number> = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
  };
  items.sort((a, b) => (levelOrder[a.level] ?? 0) - (levelOrder[b.level] ?? 0));

  return items;
}

// Публичный API: возвращает полный курс по id (с уроками и контентом). Кэшируется.
export async function loadCourseDetailsAsync(
  id: string,
): Promise<Course | null> {
  const map = await loadAllCoursesAsync();
  return map.get(id) ?? null;
}

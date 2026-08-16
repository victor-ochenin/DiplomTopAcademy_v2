import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CourseSchema, LessonFileSchema } from './schemas';

interface ValidationError {
  file: string;
  message: string;
}

export function validateData(basePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const coursesDir = join(basePath, 'src', 'data', 'courses');

  if (!existsSync(coursesDir)) {
    return [{ file: coursesDir, message: 'courses dir not found' }];
  }

  const courseFiles = readdirSync(coursesDir).filter((f) => f.endsWith('.json'));
  const seenCourseIds = new Set<string>();

  for (const file of courseFiles) {
    const coursePath = join(coursesDir, file);
    const course = CourseSchema.safeParse(readJson(coursePath, errors));
    if (!course.success) {
      for (const issue of course.error.issues) {
        errors.push({ file, message: issue.message });
      }
      continue;
    }

    if (seenCourseIds.has(course.data.id)) {
      errors.push({ file, message: `duplicate course id: ${course.data.id}` });
    }
    seenCourseIds.add(course.data.id);

    for (const ref of course.data.lessons) {
      const lessonPath = join(basePath, ref);
      if (!existsSync(lessonPath)) {
        errors.push({ file, message: `lesson file not found: ${ref}` });
        continue;
      }
      validateLesson(readJson(lessonPath, errors), lessonPath, basePath, errors);
    }
  }
  return errors;
}

function readJson(filePath: string, errors: ValidationError[]): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    errors.push({ file: filePath, message: `invalid JSON: ${(err as Error).message}` });
    return null;
  }
}

function validateLesson(raw: unknown, lessonPath: string, basePath: string, errors: ValidationError[]) {
  const lesson = LessonFileSchema.safeParse(raw);
  if (!lesson.success) {
    for (const issue of lesson.error.issues) {
      errors.push({ file: lessonPath, message: issue.message });
    }
    return;
  }
  const file = lessonPath;

  const folderName = basename(dirname(lessonPath));
  if (lesson.data.id !== folderName) {
    errors.push({ file, message: `lesson id "${lesson.data.id}" != folder name "${folderName}"` });
  }

  for (const doc of lesson.data.documents) {
    const mdPath = join(basePath, doc.contentFile);
    if (!existsSync(mdPath)) {
      errors.push({ file, message: `md not found: ${doc.contentFile}` });
    }
  }

  const seen = new Set<string>();
  for (const task of lesson.data.tasks) {
    if (seen.has(task.id)) {
      errors.push({ file, message: `duplicate task id: ${task.id}` });
    }
    seen.add(task.id);
  }
}

if (process.argv[1] && pathToFileURL(__filename).href === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[2] ?? process.cwd();
  const errors = validateData(base);
  if (errors.length) {
    for (const e of errors) {
      console.error(`✖ ${e.file}: ${e.message}`);
    }
    process.exit(1);
  }
  console.log('✓ course data is valid');
}
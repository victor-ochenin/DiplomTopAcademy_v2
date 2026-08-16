import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COURSES_DIR = join(ROOT, 'src', 'data', 'courses');
const LESSONS_DIR = join(ROOT, 'src', 'data', 'lessons');

const [courseId, lessonId, ...titleParts] = process.argv.slice(2);

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

const ID_RE = /^[a-z0-9-]+$/;

if (!courseId || !lessonId) {
  fail('Usage: npm run new:lesson -- <courseId> <lessonId> <title>');
}
if (!ID_RE.test(courseId)) {
  fail(`courseId must be slug (a-z0-9-), got: "${courseId}"`);
}
if (!ID_RE.test(lessonId)) {
  fail(`lessonId must be slug (a-z0-9-), got: "${lessonId}"`);
}
const lessonTitle =
  titleParts.length > 0 ? titleParts.join(' ') : lessonId.replace(/-/g, ' ');

const courseJsonPath = join(COURSES_DIR, `${courseId}.json`);
if (!existsSync(courseJsonPath)) {
  const available = readdirSync(COURSES_DIR)
    .filter((f) => f.endsWith('.json'))
    .join(', ');
  fail(`course "${courseId}" not found (available: ${available})`);
}
const course = JSON.parse(readFileSync(courseJsonPath, 'utf-8'));

const lessonDir = join(LESSONS_DIR, courseId, lessonId);
if (existsSync(lessonDir)) {
  fail(`lesson already exists: ${lessonDir}`);
}

const lessonPath = `src/data/lessons/${courseId}/${lessonId}/lesson.json`;
const mdFile = `${lessonId}.md`;
const contentFile = `src/data/lessons/${courseId}/${lessonId}/${mdFile}`;

const lessonJson = {
  id: lessonId,
  title: lessonTitle,
  documents: [{ id: 'intro', title: 'Введение', contentFile }],
  tasks: [],
  resources: [],
};

mkdirSync(lessonDir, { recursive: true });
writeFileSync(
  join(lessonDir, 'lesson.json'),
  JSON.stringify(lessonJson, null, 2) + '\n',
);
writeFileSync(join(lessonDir, mdFile), `# ${lessonTitle}\n\n`);

if (!course.lessons.includes(lessonPath)) {
  course.lessons.push(lessonPath);
  writeFileSync(courseJsonPath, JSON.stringify(course, null, 2) + '\n');
}

console.log(`✓ created ${lessonDir}`);
console.log(`✓ added "${lessonPath}" to ${courseId}.json`);

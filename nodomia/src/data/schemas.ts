import { z } from 'zod';

// Единый источник формы данных курсов: схемы используются валидатором
// (scripts/validate-data.ts) и рантайм-загрузчиком (src/data/courses).

export const TaskSchema = z
  .discriminatedUnion('type', [
    z.object({
      id: z.string(),
      type: z.literal('choice'),
      question: z.string(),
      options: z.array(z.string()).min(2),
      correctAnswer: z.string(),
    }),
    z.object({
      id: z.string(),
      type: z.literal('open'),
      question: z.string(),
      acceptableAnswers: z.array(z.string()).min(1),
    }),
    z.object({
      id: z.string(),
      type: z.literal('coding'),
      kind: z.enum(['file', 'project']),
      question: z.string(),
      instructions: z.string(),
      criteria: z.array(z.string()).min(1),
      starterCode: z.string().optional(),
      expectedFiles: z.array(z.string()).min(1),
    }),
  ])
  .refine(
    (task) =>
      task.type !== 'choice' || task.options.includes(task.correctAnswer),
    { message: 'correctAnswer not in options' },
  );

export const ResourceSchema = z.object({ title: z.string(), url: z.string() });

export const LessonFileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  documents: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      contentFile: z.string().regex(/\.md$/),
    }),
  ),
  tasks: z.array(TaskSchema),
  resources: z.array(ResourceSchema),
});

export const CourseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  icon: z.string().optional(),
  lessons: z
    .array(z.string().regex(/^src\/data\/lessons\/.*\/lesson\.json$/))
    .min(1),
});

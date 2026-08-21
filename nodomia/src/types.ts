import type { z } from 'zod';
import {
  DocumentFileSchema,
  LessonFileSchema,
  LevelSchema,
  ResourceSchema,
  TaskSchema,
} from './data/schemas';

export type Task = z.infer<typeof TaskSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type DocumentFile = z.infer<typeof DocumentFileSchema>;

export interface Document extends Omit<DocumentFile, 'contentFile'> {
  content: string;
}

export type Lesson = Omit<z.infer<typeof LessonFileSchema>, 'documents'> & {
  documents: Document[];
};

export interface CourseListItem {
  id: string;
  title: string;
  description: string;
  level: Level;
  category: string;
  icon?: string;
  lessonCount: number;
  taskCount: number;
  itemsCount: number;
  lessonIds: string[];
}

export interface Course extends Omit<
  CourseListItem,
  'lessonCount' | 'taskCount' | 'itemsCount' | 'lessonIds'
> {
  lessons: Lesson[];
}

import type { z } from 'zod';
import { LessonFileSchema, ResourceSchema, TaskSchema } from './data/schemas';

export type Task = z.infer<typeof TaskSchema>
export type Resource = z.infer<typeof ResourceSchema>

export interface Document {
  id: string
  title: string
  content: string
}

export type Lesson = Omit<z.infer<typeof LessonFileSchema>, 'documents'> & {
  documents: Document[]
}

export interface CourseListItem {
  id: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  icon?: string
  lessonCount: number
  taskCount: number
  itemsCount: number
  lessonIds: string[]
}

export interface Course extends Omit<CourseListItem, 'lessonCount' | 'taskCount' | 'itemsCount' | 'lessonIds'> {
  lessons: Lesson[]
}
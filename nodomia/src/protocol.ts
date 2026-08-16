import { z } from 'zod';
import type { Course, CourseListItem } from './types';

export const ChatMessageSchema = z.object({ role: z.enum(['user', 'assistant']), text: z.string() });
export const CheckResultSchema = z.object({ passed: z.boolean(), feedback: z.string() });
export const UserProgressSchema = z.object({ completedTasks: z.record(z.string(), z.boolean()) });

export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type CheckResult = z.infer<typeof CheckResultSchema>
export type UserProgress = z.infer<typeof UserProgressSchema>

// Валидируется на стороне extension: webview — недоверенный отправитель.
export const WebviewMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('getCourses') }),
  z.object({ type: z.literal('getCourseDetails'), payload: z.string() }),
  z.object({ type: z.literal('loadProgress') }),
  z.object({ type: z.literal('saveProgress'), payload: UserProgressSchema }),
  z.object({
    type: z.literal('askQuestion'),
    payload: z.object({ question: z.string(), history: z.array(ChatMessageSchema), requestId: z.number() }),
  }),
  z.object({
    type: z.literal('checkCode'),
    payload: z.object({
      taskId: z.string(),
      lessonId: z.string(),
      filePath: z.string(),
      kind: z.enum(['file', 'project']).optional(),
      expectedFiles: z.array(z.string()).optional(),
    }),
  }),
]);
export type WebviewMessage = z.infer<typeof WebviewMessageSchema>

// Типы без рантайм-проверки: extension host — доверенный отправитель.
export type ExtensionMessage =
  | { type: 'courses'; payload: CourseListItem[] }
  | { type: 'courseDetails'; payload: Course | null }
  | { type: 'progress'; payload: UserProgress }
  | { type: 'answer'; requestId: number; payload: string }
  | { type: 'ragError'; requestId: number; payload: string }
  | { type: 'checkResult'; payload: CheckResult }
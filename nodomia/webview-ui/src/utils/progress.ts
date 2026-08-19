import type { UserProgress } from '../types/messages';

export function completeKey(lessonId: string, itemId: string): string {
  return `${lessonId}:${itemId}`;
}

export function completedCountForCourse(
  progress: UserProgress,
  lessonIds: string[],
): number {
  const prefixes = new Set(lessonIds.map((lid) => `${lid}:`));
  return Object.keys(progress.completedTasks).filter((key) => {
    const sep = key.indexOf(':');
    return sep !== -1 && prefixes.has(key.slice(0, sep + 1));
  }).length;
}

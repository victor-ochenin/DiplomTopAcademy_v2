import type { Task } from '../../types/messages';
import ChoiceTask from './ChoiceTask';
import OpenTask from './OpenTask';
import CodingTask from './CodingTask';

interface TaskRendererProps {
  task: Task;
  lessonId: string;
  onCompleteItem: (lessonId: string, itemId: string) => void;
}

export default function TaskRenderer({
  task,
  lessonId,
  onCompleteItem,
}: TaskRendererProps) {
  switch (task.type) {
    case 'choice':
      return (
        <ChoiceTask
          task={task}
          onComplete={() => onCompleteItem(lessonId, task.id)}
        />
      );
    case 'open':
      return (
        <OpenTask
          task={task}
          onComplete={() => onCompleteItem(lessonId, task.id)}
        />
      );
    case 'coding':
      return (
        <CodingTask
          task={task}
          lessonId={lessonId}
          onCompleteItem={onCompleteItem}
        />
      );
    default: {
      const _exhaustive: never = task;
      return null;
    }
  }
}

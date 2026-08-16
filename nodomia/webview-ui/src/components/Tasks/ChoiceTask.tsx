import { useState } from 'react';
import type { Task } from '../../types/messages';
import '../../styles/components.css';

interface ChoiceTaskProps {
  task: Extract<Task, { type: 'choice' }>;
  onComplete?: () => void;
}

export default function ChoiceTask({ task, onComplete }: ChoiceTaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleCheck = () => {
    if (!selected) return;
    const correct = selected === task.correctAnswer;
    setIsCorrect(correct);
    setChecked(true);
    if (correct) onComplete?.();
  };

  return (
    <div className="task">
      <p className="task__question">{task.question}</p>
      <div className="task__options">
        {task.options.map((option) => (
          <label
            key={option}
            className={`task__radio-label${checked ? ' task__radio-label--disabled' : ''}`}
          >
            <input
              type="radio"
              name={task.id}
              value={option}
              checked={selected === option}
              onChange={() => {
                if (!checked) setSelected(option);
              }}
              disabled={checked}
            />
            {option}
          </label>
        ))}
      </div>
      {!checked && (
        <button
          className="task__button"
          onClick={handleCheck}
          disabled={!selected}
        >
          Проверить
        </button>
      )}
      {checked && (
        <p
          className={`task__result task__result--${isCorrect ? 'correct' : 'incorrect'}`}
        >
          {isCorrect ? 'Верно' : 'Неверно'}
        </p>
      )}
    </div>
  );
}

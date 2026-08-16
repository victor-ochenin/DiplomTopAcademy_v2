import type { CourseListItem, UserProgress } from '../../types/messages';
import { pluralize } from '../../utils/plural';

interface CourseCardProps {
  course: CourseListItem;
  onEnter: () => void;
  progress?: UserProgress;
}

function progressColor(pct: number): string {
  return pct === 100 ? '#29b6f6' : '#4fc3f7';
}

export default function CourseCard({
  course,
  onEnter,
  progress,
}: CourseCardProps) {
  let completedItems = 0;
  if (progress) {
    for (const lid of course.lessonIds) {
      for (const key of Object.keys(progress.completedTasks)) {
        if (key.startsWith(lid + ':')) {
          completedItems++;
        }
      }
    }
  }
  const percent =
    course.itemsCount > 0
      ? Math.round((completedItems / course.itemsCount) * 100)
      : 0;

  const iconEl = course.icon ? (
    <div
      className="course-icon"
      dangerouslySetInnerHTML={{
        __html: course.icon,
      }} /* SVG из своих JSON, доверенный */
    />
  ) : (
    <div className="course-icon course-icon--fallback">
      {course.title.slice(0, 2)}
    </div>
  );

  return (
    <div className="card-wrapper">
      <div className="card" onClick={onEnter}>
        <div className="card-header">
          <div className="card-header-left">
            {iconEl}
            <div className="card-title-group">
              <div className="card-title-row">
                <span className="card-title">{course.title}</span>
              </div>
            </div>
          </div>
          {percent > 0 && (
            <span
              className="card-progress"
              style={{ color: progressColor(percent) }}
            >
              {percent}%
            </span>
          )}
        </div>

        <span className={`level-badge level-${course.level}`}>
          {course.level === 'beginner'
            ? 'НОВИЧОК'
            : course.level === 'intermediate'
              ? 'СРЕДНИЙ'
              : 'ПРОДВИНУТЫЙ'}
        </span>

        <p className="card-description">{course.description}</p>

        <div className="card-footer">
          <div className="footer-item">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>
              {course.lessonCount}{' '}
              {pluralize(course.lessonCount, 'урок', 'урока', 'уроков')}
            </span>
          </div>
          <div className="footer-item">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>
              {course.itemsCount}{' '}
              {pluralize(course.itemsCount, 'задание', 'задания', 'заданий')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

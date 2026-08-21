import type { CourseListItem, UserProgress } from '../../types/messages';
import CourseCard from './CourseCard';
import { pluralize } from '../../utils/plural';
import { categoryInfo } from '../../utils/categories';

interface CoursesPageProps {
  courses: CourseListItem[];
  onSelectCourse: (id: string) => void;
  progress: UserProgress;
}

export default function CoursesPage({
  courses,
  onSelectCourse,
  progress,
}: CoursesPageProps) {
  const count = courses.length;

  // группировка курсов по категории, сохраняя порядок появления
  const sections = courses.reduce<
    Array<{ category: string; courses: CourseListItem[] }>
  >((acc, course) => {
    const existing = acc.find((s) => s.category === course.category);
    if (existing) {
      existing.courses.push(course);
    } else {
      acc.push({ category: course.category, courses: [course] });
    }
    return acc;
  }, []);

  return (
    <div className="courses-page">
      <h1 className="courses-title">
        Обзор курсов{' '}
        <span className="courses-count">
          {count} {pluralize(count, 'курс', 'курса', 'курсов')}
        </span>
      </h1>

      {sections.map((section) => {
        const info = categoryInfo(section.category);
        return (
          <section
            key={section.category}
            className="course-section"
            style={{ '--section-accent': info.accent } as React.CSSProperties}
          >
            <h2 className="course-section__title">
              {section.courses[0]?.icon ? (
                <span
                  className="course-section__icon"
                  dangerouslySetInnerHTML={{
                    __html: section.courses[0].icon,
                  }} /* SVG из своих JSON, доверенный */
                />
              ) : (
                <span className="course-section__dot" />
              )}
              {info.label}
              <span className="course-section__count">
                {section.courses.length}{' '}
                {pluralize(
                  section.courses.length,
                  'курс',
                  'курса',
                  'курсов',
                )}
              </span>
            </h2>
            <div className="courses-grid">
              {section.courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnter={() => onSelectCourse(course.id)}
                  progress={progress}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}